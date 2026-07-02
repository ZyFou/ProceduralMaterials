# Procedural Materials

**Open-source procedural PBR material editor for Three.js — in the browser.**

Build materials as node graphs, watch them render in real time on a PBR-lit 3D preview, and export
ready-to-use texture maps. Every material is fully procedural, non-destructive, and GPU-evaluated:
each node is a GLSL fragment shader rendered to its own texture.

## Quick start

```bash
npm install
npm run dev
```

Then open the printed local URL.

## What works today (Phase 1)

- **Node graph editor** — infinite canvas with pan/zoom, drag-to-connect ports, drag-to-detach,
  cycle prevention, node search menu (right-click), live per-node thumbnails, keyboard delete.
- **GPU texture engine** — every node renders through its own shader into a render target;
  the graph is re-evaluated on change in topological order. All noise is lattice-wrapped so
  textures tile seamlessly.
- **Nodes** — Noise (Perlin FBM / Ridged / Billow), Voronoi, Brick, Checker, Gradient, Color,
  Value, Levels, Colorize, Invert, Blur, Blend (5 modes + mask), Warp, Transform, Normal Map,
  and per-channel Output nodes.
- **PBR outputs** — Base Color, Normal, Roughness, Metalness, Height, AO, Emissive, generated at
  256–2048 px and driving the live preview (including displacement).
- **Live 3D preview** — Three.js `MeshStandardMaterial` with IBL environment, tone mapping,
  orbit controls, auto-rotate, five preview shapes, tiling and displacement controls.
- **Material library** — built-in procedural presets: Weathered Rock, Red Bricks, Marble,
  Rusted Steel, Polished Gold, Lava Flow.
- **Save / load** — material graphs as JSON files.
- **Export** — all output channels as PNG files.
- **Performance panel** — FPS, frame time, draw calls, triangles, texture count, VRAM estimate.

## Using exported maps in Three.js

```js
const loader = new THREE.TextureLoader();
const material = new THREE.MeshStandardMaterial({
  map: loader.load('material_basecolor.png'),
  normalMap: loader.load('material_normal.png'),
  roughnessMap: loader.load('material_roughness.png'),
  aoMap: loader.load('material_ao.png'),
  displacementMap: loader.load('material_height.png'),
});
material.map.colorSpace = THREE.SRGBColorSpace;
```

## Roadmap

- Dockable / resizable workspaces, custom layouts
- More node categories (generators, masks, math, filters)
- HDRI environment library and custom HDRI import
- GPU baking (curvature, thickness, bent normals)
- Material instances and preset sharing
- Direct `MeshStandardMaterial` / TSL code export
- WebGPU renderer
- Plugin API

## Tech stack

Vite · React · TypeScript · Three.js · Zustand. MIT licensed.
