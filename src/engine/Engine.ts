import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { NODE_DEFS, VERTEX_SHADER, buildFragmentShader } from './nodeDefs';
import { useStore, type PreviewShape } from '../store';
import type { Edge, NodeInstance, OutputChannel } from '../types';
import { OUTPUT_CHANNELS } from '../types';

const THUMB_SIZE = 96;
const OUTPUT_THUMB_SIZE = 128;

export interface EngineStats {
  fps: number;
  frameMs: number;
  drawCalls: number;
  triangles: number;
  textures: number;
  nodeCount: number;
  resolution: number;
  vramMB: number;
}

interface NodeResources {
  material: THREE.ShaderMaterial;
  rt: THREE.WebGLRenderTarget;
  type: string;
}

function makeRenderTarget(size: number): THREE.WebGLRenderTarget {
  const rt = new THREE.WebGLRenderTarget(size, size, {
    wrapS: THREE.RepeatWrapping,
    wrapT: THREE.RepeatWrapping,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
    generateMipmaps: true,
    depthBuffer: false,
  });
  return rt;
}

/**
 * The node pipeline works in display (sRGB-ish) space: what you see in a
 * thumbnail is exactly what gets exported. The preview material decodes
 * color maps to linear in its shader (see patchColorDecode).
 */
class Engine {
  renderer: THREE.WebGLRenderer;

  // --- node evaluation ---
  private quadScene = new THREE.Scene();
  private quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private quadMesh: THREE.Mesh;
  private copyMaterial: THREE.ShaderMaterial;
  private resources = new Map<string, NodeResources>();
  private defaultTextures = new Map<string, THREE.DataTexture>();
  private thumbRT = makeRenderTarget(THUMB_SIZE);
  private outputThumbRT = makeRenderTarget(OUTPUT_THUMB_SIZE);
  private thumbCanvases = new Map<string, HTMLCanvasElement>();
  private outputCanvases = new Map<string, HTMLCanvasElement>();
  private dirty = true;
  private channelSources = new Map<OutputChannel, string>();

  // --- preview scene ---
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(40, 1, 0.01, 100);
  private controls: OrbitControls | null = null;
  private mesh: THREE.Mesh;
  private keyLight: THREE.DirectionalLight;
  private previewMaterial: THREE.MeshStandardMaterial;
  private geometries: Partial<Record<PreviewShape, THREE.BufferGeometry>> = {};
  private container: HTMLElement | null = null;

  // --- stats ---
  private frameCount = 0;
  private statTime = performance.now();
  private lastFrameMs = 0;
  private statsListeners = new Set<(s: EngineStats) => void>();
  onOutputsChanged: (() => void) | null = null;

  addStatsListener(fn: (s: EngineStats) => void): () => void {
    this.statsListeners.add(fn);
    return () => this.statsListeners.delete(fn);
  }

  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.quadMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quadMesh.frustumCulled = false;
    this.quadScene.add(this.quadMesh);

    this.copyMaterial = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: `
        uniform sampler2D u_map;
        varying vec2 vUv;
        void main() { gl_FragColor = texture2D(u_map, vUv); }
      `,
      uniforms: { u_map: { value: null } },
      depthTest: false,
      depthWrite: false,
    });

    // preview scene ------------------------------------------------------
    this.scene.background = new THREE.Color(0x101216);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    this.keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
    this.keyLight.position.set(2.5, 3, 2);
    this.scene.add(this.keyLight);
    const rim = new THREE.DirectionalLight(0x8899ff, 0.5);
    rim.position.set(-3, 1, -2.5);
    this.scene.add(rim);

    this.previewMaterial = new THREE.MeshStandardMaterial({
      roughness: 0.6,
      metalness: 0,
    });
    this.patchColorDecode(this.previewMaterial);

    this.mesh = new THREE.Mesh(this.getGeometry('sphere'), this.previewMaterial);
    this.scene.add(this.mesh);
    this.camera.position.set(0, 0.6, 2.6);

    // react to store changes ---------------------------------------------
    let prevVersion = useStore.getState().graphVersion;
    let prevResolution = useStore.getState().resolution;
    useStore.subscribe((s) => {
      if (s.resolution !== prevResolution) {
        prevResolution = s.resolution;
        this.disposeNodeResources();
      }
      if (s.graphVersion !== prevVersion) {
        prevVersion = s.graphVersion;
        this.dirty = true;
      }
      this.syncPreviewSettings();
    });
    this.syncPreviewSettings();

    this.renderer.setAnimationLoop(() => this.frame());
  }

  // ---------------------------------------------------------------- setup

  mount(container: HTMLElement) {
    this.container = container;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.display = 'block';
    if (!this.controls) {
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.08;
      this.controls.minDistance = 1;
      this.controls.maxDistance = 8;
    }
    this.resize();
  }

  unmount() {
    if (this.container && this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
    this.container = null;
  }

  resize() {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  registerThumb(nodeId: string, canvas: HTMLCanvasElement | null) {
    if (canvas) {
      this.thumbCanvases.set(nodeId, canvas);
      this.dirty = true;
    } else {
      this.thumbCanvases.delete(nodeId);
    }
  }

  registerOutputCanvas(channel: string, canvas: HTMLCanvasElement | null) {
    if (canvas) {
      this.outputCanvases.set(channel, canvas);
      this.dirty = true;
    } else {
      this.outputCanvases.delete(channel);
    }
  }

  getChannelSources(): Map<OutputChannel, string> {
    return this.channelSources;
  }

  // ------------------------------------------------------------ materials

  /** Decode sRGB-authored color/emissive maps to linear inside the shader,
   *  since our render-target textures cannot carry an sRGB internal format. */
  private patchColorDecode(material: THREE.MeshStandardMaterial) {
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <map_fragment>',
          `#ifdef USE_MAP
             vec4 sampledDiffuseColor = texture2D( map, vMapUv );
             sampledDiffuseColor.rgb = pow( sampledDiffuseColor.rgb, vec3( 2.2 ) );
             diffuseColor *= sampledDiffuseColor;
           #endif`
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#ifdef USE_EMISSIVEMAP
             vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
             emissiveColor.rgb = pow( emissiveColor.rgb, vec3( 2.2 ) );
             totalEmissiveRadiance *= emissiveColor.rgb;
           #endif`
        );
    };
  }

  private getGeometry(shape: PreviewShape): THREE.BufferGeometry {
    if (!this.geometries[shape]) {
      let geo: THREE.BufferGeometry;
      switch (shape) {
        case 'cube':
          geo = new THREE.BoxGeometry(1.1, 1.1, 1.1, 64, 64, 64);
          break;
        case 'plane':
          geo = new THREE.PlaneGeometry(1.9, 1.9, 256, 256);
          geo.rotateX(-Math.PI / 2);
          break;
        case 'torusknot':
          geo = new THREE.TorusKnotGeometry(0.55, 0.2, 300, 48);
          break;
        case 'cylinder':
          geo = new THREE.CylinderGeometry(0.55, 0.55, 1.1, 128, 64);
          break;
        default:
          geo = new THREE.SphereGeometry(0.8, 200, 100);
      }
      this.geometries[shape] = geo;
    }
    return this.geometries[shape]!;
  }

  private syncPreviewSettings() {
    const s = useStore.getState();
    if (this.mesh.geometry !== this.getGeometry(s.previewShape)) {
      this.mesh.geometry = this.getGeometry(s.previewShape);
    }
    if (this.controls) this.controls.autoRotate = s.autoRotate;
    if (this.controls) this.controls.autoRotateSpeed = 1.2;
    this.scene.environmentIntensity = s.envIntensity;
    (this.scene.background as THREE.Color).setRGB(
      s.backgroundColor[0],
      s.backgroundColor[1],
      s.backgroundColor[2]
    );
    this.keyLight.color.setRGB(s.lightColor[0], s.lightColor[1], s.lightColor[2]);
    const hasHeight = this.channelSources.has('height');
    this.previewMaterial.displacementScale = hasHeight ? s.displacement : 0;
    for (const tex of this.channelTextures()) {
      tex.repeat.set(s.tiling, s.tiling);
    }
  }

  private channelTextures(): THREE.Texture[] {
    const m = this.previewMaterial;
    return [m.map, m.normalMap, m.roughnessMap, m.metalnessMap, m.aoMap, m.displacementMap, m.emissiveMap]
      .filter((t): t is THREE.Texture => !!t);
  }

  private getNodeResources(node: NodeInstance, resolution: number): NodeResources {
    let res = this.resources.get(node.id);
    if (!res) {
      const def = NODE_DEFS[node.type];
      const uniforms: Record<string, THREE.IUniform> = {
        u_texel: { value: new THREE.Vector2(1 / resolution, 1 / resolution) },
      };
      def.inputs.forEach((_inp, i) => {
        uniforms[`u_in${i}`] = { value: null };
      });
      for (const p of def.params) {
        uniforms[`u_${p.key}`] = { value: p.kind === 'color' ? new THREE.Color() : 0 };
      }
      const material = new THREE.ShaderMaterial({
        vertexShader: VERTEX_SHADER,
        fragmentShader: buildFragmentShader(def),
        uniforms,
        depthTest: false,
        depthWrite: false,
      });
      res = { material, rt: makeRenderTarget(resolution), type: node.type };
      this.resources.set(node.id, res);
    }
    return res;
  }

  private defaultTexture(rgba: [number, number, number, number]): THREE.DataTexture {
    const key = rgba.join(',');
    let tex = this.defaultTextures.get(key);
    if (!tex) {
      const data = new Uint8Array(rgba.map((v) => Math.round(v * 255)));
      tex = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
      tex.needsUpdate = true;
      this.defaultTextures.set(key, tex);
    }
    return tex;
  }

  private disposeNodeResources() {
    for (const res of this.resources.values()) {
      res.material.dispose();
      res.rt.dispose();
    }
    this.resources.clear();
    this.dirty = true;
  }

  // ------------------------------------------------------------ evaluation

  private topoSort(nodes: Record<string, NodeInstance>, edges: Edge[]): NodeInstance[] {
    const indeg = new Map<string, number>();
    for (const id of Object.keys(nodes)) indeg.set(id, 0);
    for (const e of edges) {
      if (nodes[e.from] && nodes[e.to]) indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
    }
    const queue = [...indeg.entries()].filter(([, d]) => d === 0).map(([id]) => id);
    const order: NodeInstance[] = [];
    while (queue.length) {
      const id = queue.shift()!;
      order.push(nodes[id]);
      for (const e of edges) {
        if (e.from !== id || !nodes[e.to]) continue;
        const d = (indeg.get(e.to) ?? 0) - 1;
        indeg.set(e.to, d);
        if (d === 0) queue.push(e.to);
      }
    }
    return order;
  }

  private evaluate() {
    const s = useStore.getState();
    const { nodes, edges, resolution } = s;

    // drop resources for deleted nodes
    for (const [id, res] of [...this.resources]) {
      if (!nodes[id]) {
        res.material.dispose();
        res.rt.dispose();
        this.resources.delete(id);
      }
    }

    const order = this.topoSort(nodes, edges);
    for (const node of order) {
      const def = NODE_DEFS[node.type];
      if (!def) continue;
      const res = this.getNodeResources(node, resolution);
      const u = res.material.uniforms;
      (u.u_texel.value as THREE.Vector2).set(1 / resolution, 1 / resolution);

      for (const p of def.params) {
        const value = node.params[p.key] ?? p.default;
        if (p.kind === 'color') {
          const c = value as [number, number, number];
          (u[`u_${p.key}`].value as THREE.Color).setRGB(c[0], c[1], c[2]);
        } else if (p.kind === 'select') {
          u[`u_${p.key}`].value = Math.max(0, p.options!.findIndex((o) => o.value === value));
        } else {
          u[`u_${p.key}`].value = value as number;
        }
      }

      def.inputs.forEach((inp, i) => {
        const edge = edges.find((e) => e.to === node.id && e.toPort === i && nodes[e.from]);
        u[`u_in${i}`].value = edge
          ? this.resources.get(edge.from)?.rt.texture ?? this.defaultTexture(inp.default)
          : this.defaultTexture(inp.default);
      });

      this.quadMesh.material = res.material;
      this.renderer.setRenderTarget(res.rt);
      this.renderer.render(this.quadScene, this.quadCamera);
    }
    this.renderer.setRenderTarget(null);

    // map output channels to feeding nodes
    this.channelSources.clear();
    for (const node of order) {
      if (!node || node.type !== 'output') continue;
      const channel = node.params.channel as OutputChannel;
      if (OUTPUT_CHANNELS.includes(channel)) this.channelSources.set(channel, node.id);
    }

    this.updatePreviewMaterial();
    this.updateThumbnails(nodes);
    this.syncPreviewSettings();
    this.onOutputsChanged?.();
  }

  private channelTexture(channel: OutputChannel): THREE.Texture | null {
    const id = this.channelSources.get(channel);
    if (!id) return null;
    return this.resources.get(id)?.rt.texture ?? null;
  }

  private updatePreviewMaterial() {
    const m = this.previewMaterial;
    const maskKey = () =>
      [m.map, m.normalMap, m.roughnessMap, m.metalnessMap, m.aoMap, m.displacementMap, m.emissiveMap]
        .map((t) => (t ? 1 : 0))
        .join('');
    const before = maskKey();

    m.map = this.channelTexture('basecolor');
    m.normalMap = this.channelTexture('normal');
    m.roughnessMap = this.channelTexture('roughness');
    m.metalnessMap = this.channelTexture('metalness');
    m.aoMap = this.channelTexture('ao');
    m.displacementMap = this.channelTexture('height');
    m.emissiveMap = this.channelTexture('emissive');

    m.color.set(0xffffff);
    m.roughness = m.roughnessMap ? 1 : 0.6;
    m.metalness = m.metalnessMap ? 1 : 0;
    m.aoMapIntensity = 1;
    m.emissive.set(m.emissiveMap ? 0xffffff : 0x000000);
    m.normalScale.set(1, 1);

    if (maskKey() !== before) m.needsUpdate = true;
  }

  /** Draw a render-target texture into a 2D canvas (flipping Y). */
  private blitToCanvas(tex: THREE.Texture, rt: THREE.WebGLRenderTarget, canvas: HTMLCanvasElement) {
    const size = rt.width;
    this.copyMaterial.uniforms.u_map.value = tex;
    this.quadMesh.material = this.copyMaterial;
    this.renderer.setRenderTarget(rt);
    this.renderer.render(this.quadScene, this.quadCamera);
    const buf = new Uint8Array(size * size * 4);
    this.renderer.readRenderTargetPixels(rt, 0, 0, size, size, buf);
    this.renderer.setRenderTarget(null);

    const flipped = new Uint8ClampedArray(size * size * 4);
    const rowBytes = size * 4;
    for (let y = 0; y < size; y++) {
      flipped.set(buf.subarray(y * rowBytes, (y + 1) * rowBytes), (size - 1 - y) * rowBytes);
    }
    canvas.width = size;
    canvas.height = size;
    canvas.getContext('2d')!.putImageData(new ImageData(flipped, size, size), 0, 0);
  }

  private updateThumbnails(nodes: Record<string, NodeInstance>) {
    for (const [nodeId, canvas] of this.thumbCanvases) {
      if (!nodes[nodeId]) continue;
      const res = this.resources.get(nodeId);
      if (res) this.blitToCanvas(res.rt.texture, this.thumbRT, canvas);
    }
    for (const [channel, canvas] of this.outputCanvases) {
      const tex = this.channelTexture(channel as OutputChannel);
      if (tex) this.blitToCanvas(tex, this.outputThumbRT, canvas);
      else {
        canvas.width = OUTPUT_THUMB_SIZE;
        canvas.height = OUTPUT_THUMB_SIZE;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#16181d';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }

  // ------------------------------------------------------------ rendering

  private frame() {
    const start = performance.now();
    if (this.dirty) {
      this.dirty = false;
      this.evaluate();
    }
    this.controls?.update();
    this.renderer.render(this.scene, this.camera);
    this.lastFrameMs = performance.now() - start;

    this.frameCount++;
    const now = performance.now();
    if (now - this.statTime >= 500) {
      const fps = (this.frameCount * 1000) / (now - this.statTime);
      this.frameCount = 0;
      this.statTime = now;
      const s = useStore.getState();
      const nodeCount = Object.keys(s.nodes).length;
      const vramMB = (nodeCount * s.resolution * s.resolution * 4 * 1.34) / (1024 * 1024);
      const stats: EngineStats = {
        fps: Math.round(fps),
        frameMs: this.lastFrameMs,
        drawCalls: this.renderer.info.render.calls,
        triangles: this.renderer.info.render.triangles,
        textures: this.renderer.info.memory.textures,
        nodeCount,
        resolution: s.resolution,
        vramMB,
      };
      for (const fn of this.statsListeners) fn(stats);
    }
  }

  // -------------------------------------------------------------- export

  /** Read a full-resolution PNG blob for one output channel. */
  async exportChannelPNG(channel: OutputChannel): Promise<Blob | null> {
    const id = this.channelSources.get(channel);
    const res = id ? this.resources.get(id) : null;
    if (!res) return null;

    const size = res.rt.width;
    const exportRT = makeRenderTarget(size);
    const canvas = document.createElement('canvas');
    this.blitToCanvas(res.rt.texture, exportRT, canvas);
    exportRT.dispose();
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
  }
}

export const engine = new Engine();
