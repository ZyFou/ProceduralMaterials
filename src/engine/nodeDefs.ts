import type { NodeDef, OutputChannel } from '../types';
import { CHANNEL_LABELS, OUTPUT_CHANNELS } from '../types';

export const VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/** Shared GLSL helpers prepended to every node fragment shader.
 *  All noise is lattice-wrapped by its period so textures tile seamlessly
 *  as long as scale parameters are integers. */
const COMMON_GLSL = /* glsl */ `
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec2 hash22(vec2 p) {
  vec3 a = fract(p.xyx * vec3(123.34, 234.34, 345.65));
  a += dot(a, a + 34.45);
  return fract(vec2(a.x * a.y, a.y * a.z));
}

vec2 gradDir(vec2 i, float seed) {
  float h = hash21(i + vec2(seed * 127.1, seed * 311.7)) * 6.2831853;
  return vec2(cos(h), sin(h));
}

float pnoise(vec2 p, vec2 period, float seed) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(gradDir(mod(i, period), seed), f);
  float b = dot(gradDir(mod(i + vec2(1.0, 0.0), period), seed), f - vec2(1.0, 0.0));
  float c = dot(gradDir(mod(i + vec2(0.0, 1.0), period), seed), f - vec2(0.0, 1.0));
  float d = dot(gradDir(mod(i + vec2(1.0, 1.0), period), seed), f - vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 uv, float scale, float octaves, float gain, float seed, int ntype) {
  vec2 p = uv * scale;
  vec2 period = vec2(scale);
  float amp = 1.0;
  float sum = 0.0;
  float norm = 0.0;
  for (int i = 0; i < 8; i++) {
    if (float(i) >= octaves) break;
    float n = pnoise(p, period, seed + float(i) * 7.31);
    if (ntype == 1) n = 0.7 - abs(n) * 1.8;      // ridged
    else if (ntype == 2) n = abs(n) * 1.8 - 0.35; // billow
    sum += n * amp;
    norm += amp;
    amp *= gain;
    p *= 2.0;
    period *= 2.0;
  }
  return clamp(sum / max(norm, 1e-5) * 0.75 + 0.5, 0.0, 1.0);
}

vec3 voronoi(vec2 uv, float scale, float randomness, float seed) {
  vec2 p = uv * scale;
  vec2 i = floor(p);
  vec2 f = fract(p);
  float f1 = 8.0;
  float f2 = 8.0;
  vec2 id = vec2(0.0);
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 o = vec2(float(x), float(y));
      vec2 cell = mod(i + o, vec2(scale));
      vec2 rp = hash22(cell + seed * 13.7) * randomness;
      float d = length(o + rp - f);
      if (d < f1) { f2 = f1; f1 = d; id = cell; }
      else if (d < f2) { f2 = d; }
    }
  }
  return vec3(f1, f2, hash21(id + seed * 13.7));
}

float luma(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}
`;

export function buildFragmentShader(def: NodeDef): string {
  const lines: string[] = ['uniform vec2 u_texel;'];
  def.inputs.forEach((_inp, i) => lines.push(`uniform sampler2D u_in${i};`));
  for (const p of def.params) {
    if (p.kind === 'color') lines.push(`uniform vec3 u_${p.key};`);
    else lines.push(`uniform float u_${p.key};`);
  }
  lines.push('varying vec2 vUv;');
  return `${lines.join('\n')}\n${COMMON_GLSL}\n${def.frag}`;
}

const PASSTHROUGH = /* glsl */ `
void main() {
  gl_FragColor = texture2D(u_in0, vUv);
}
`;

export const NODE_DEFS: Record<string, NodeDef> = {
  noise: {
    type: 'noise',
    label: 'Noise',
    category: 'Generators',
    inputs: [],
    params: [
      {
        key: 'ntype', label: 'Type', kind: 'select', default: 'fbm',
        options: [
          { value: 'fbm', label: 'Perlin FBM' },
          { value: 'ridged', label: 'Ridged' },
          { value: 'billow', label: 'Billow' },
        ],
      },
      { key: 'scale', label: 'Scale', kind: 'int', default: 8, min: 1, max: 64, step: 1 },
      { key: 'octaves', label: 'Detail', kind: 'int', default: 4, min: 1, max: 8, step: 1 },
      { key: 'gain', label: 'Roughness', kind: 'float', default: 0.5, min: 0, max: 1, step: 0.01 },
      { key: 'seed', label: 'Seed', kind: 'int', default: 0, min: 0, max: 100, step: 1 },
    ],
    frag: /* glsl */ `
void main() {
  float n = fbm(vUv, u_scale, u_octaves, u_gain, u_seed, int(u_ntype + 0.5));
  gl_FragColor = vec4(vec3(n), 1.0);
}
`,
  },

  voronoi: {
    type: 'voronoi',
    label: 'Voronoi',
    category: 'Generators',
    inputs: [],
    params: [
      {
        key: 'mode', label: 'Output', kind: 'select', default: 'distance',
        options: [
          { value: 'distance', label: 'Distance' },
          { value: 'edges', label: 'Edges' },
          { value: 'cells', label: 'Cells' },
        ],
      },
      { key: 'scale', label: 'Scale', kind: 'int', default: 8, min: 1, max: 64, step: 1 },
      { key: 'randomness', label: 'Randomness', kind: 'float', default: 1, min: 0, max: 1, step: 0.01 },
      { key: 'seed', label: 'Seed', kind: 'int', default: 0, min: 0, max: 100, step: 1 },
    ],
    frag: /* glsl */ `
void main() {
  vec3 v = voronoi(vUv, u_scale, u_randomness, u_seed);
  int m = int(u_mode + 0.5);
  float o;
  if (m == 0) o = clamp(v.x, 0.0, 1.0);
  else if (m == 1) o = clamp((v.y - v.x) * 2.0, 0.0, 1.0);
  else o = v.z;
  gl_FragColor = vec4(vec3(o), 1.0);
}
`,
  },

  brick: {
    type: 'brick',
    label: 'Brick',
    category: 'Generators',
    inputs: [],
    params: [
      { key: 'columns', label: 'Columns', kind: 'int', default: 4, min: 1, max: 32, step: 1 },
      { key: 'rows', label: 'Rows', kind: 'int', default: 8, min: 1, max: 64, step: 1 },
      { key: 'offset', label: 'Row Offset', kind: 'float', default: 0.5, min: 0, max: 1, step: 0.01 },
      { key: 'mortar', label: 'Mortar', kind: 'float', default: 0.05, min: 0, max: 0.3, step: 0.005 },
      { key: 'bevel', label: 'Bevel', kind: 'float', default: 0.06, min: 0, max: 0.3, step: 0.005 },
      { key: 'variation', label: 'Variation', kind: 'float', default: 0.3, min: 0, max: 1, step: 0.01 },
      { key: 'seed', label: 'Seed', kind: 'int', default: 0, min: 0, max: 100, step: 1 },
    ],
    frag: /* glsl */ `
void main() {
  vec2 p = vUv * vec2(u_columns, u_rows);
  float row = floor(p.y);
  p.x += mod(row, 2.0) * u_offset;
  vec2 cell = vec2(mod(floor(p.x), u_columns), mod(row, u_rows));
  vec2 f = fract(p);
  float bx = smoothstep(0.0, u_mortar + u_bevel, f.x)
           * smoothstep(1.0, 1.0 - u_mortar - u_bevel, f.x);
  float by = smoothstep(0.0, u_mortar + u_bevel, f.y)
           * smoothstep(1.0, 1.0 - u_mortar - u_bevel, f.y);
  float mask = bx * by;
  float v = hash21(cell + u_seed * 13.7);
  float o = mask * mix(1.0, 0.4 + v * 0.6, u_variation);
  gl_FragColor = vec4(vec3(o), 1.0);
}
`,
  },

  checker: {
    type: 'checker',
    label: 'Checker',
    category: 'Generators',
    inputs: [],
    params: [
      { key: 'scale', label: 'Scale', kind: 'int', default: 8, min: 1, max: 64, step: 1 },
    ],
    frag: /* glsl */ `
void main() {
  vec2 p = floor(vUv * u_scale);
  gl_FragColor = vec4(vec3(mod(p.x + p.y, 2.0)), 1.0);
}
`,
  },

  gradient: {
    type: 'gradient',
    label: 'Gradient',
    category: 'Generators',
    inputs: [],
    params: [
      {
        key: 'mode', label: 'Type', kind: 'select', default: 'linear',
        options: [
          { value: 'linear', label: 'Linear' },
          { value: 'radial', label: 'Radial' },
          { value: 'angular', label: 'Angular' },
        ],
      },
    ],
    frag: /* glsl */ `
void main() {
  int m = int(u_mode + 0.5);
  float g;
  if (m == 0) g = vUv.x;
  else if (m == 1) g = 1.0 - length(vUv - 0.5) * 2.0;
  else g = fract(atan(vUv.y - 0.5, vUv.x - 0.5) / 6.2831853 + 0.5);
  gl_FragColor = vec4(vec3(clamp(g, 0.0, 1.0)), 1.0);
}
`,
  },

  color: {
    type: 'color',
    label: 'Color',
    category: 'Generators',
    inputs: [],
    params: [
      { key: 'color', label: 'Color', kind: 'color', default: [0.8, 0.8, 0.8] },
    ],
    frag: /* glsl */ `
void main() {
  gl_FragColor = vec4(u_color, 1.0);
}
`,
  },

  value: {
    type: 'value',
    label: 'Value',
    category: 'Generators',
    inputs: [],
    params: [
      { key: 'value', label: 'Value', kind: 'float', default: 0.5, min: 0, max: 1, step: 0.01 },
    ],
    frag: /* glsl */ `
void main() {
  gl_FragColor = vec4(vec3(u_value), 1.0);
}
`,
  },

  levels: {
    type: 'levels',
    label: 'Levels',
    category: 'Filters',
    inputs: [{ key: 'in', label: 'In', default: [0, 0, 0, 1] }],
    params: [
      { key: 'inlow', label: 'In Low', kind: 'float', default: 0, min: 0, max: 1, step: 0.01 },
      { key: 'inhigh', label: 'In High', kind: 'float', default: 1, min: 0, max: 1, step: 0.01 },
      { key: 'gamma', label: 'Gamma', kind: 'float', default: 1, min: 0.1, max: 4, step: 0.01 },
      { key: 'outlow', label: 'Out Low', kind: 'float', default: 0, min: 0, max: 1, step: 0.01 },
      { key: 'outhigh', label: 'Out High', kind: 'float', default: 1, min: 0, max: 1, step: 0.01 },
    ],
    frag: /* glsl */ `
void main() {
  vec4 t = texture2D(u_in0, vUv);
  vec3 v = clamp((t.rgb - vec3(u_inlow)) / max(u_inhigh - u_inlow, 1e-4), 0.0, 1.0);
  v = pow(v, vec3(1.0 / max(u_gamma, 1e-3)));
  v = mix(vec3(u_outlow), vec3(u_outhigh), v);
  gl_FragColor = vec4(v, t.a);
}
`,
  },

  colorize: {
    type: 'colorize',
    label: 'Colorize',
    category: 'Filters',
    inputs: [{ key: 'in', label: 'In', default: [0.5, 0.5, 0.5, 1] }],
    params: [
      { key: 'color0', label: 'Shadows', kind: 'color', default: [0.1, 0.1, 0.1] },
      { key: 'color1', label: 'Midtones', kind: 'color', default: [0.5, 0.5, 0.5] },
      { key: 'color2', label: 'Highlights', kind: 'color', default: [0.95, 0.95, 0.95] },
    ],
    frag: /* glsl */ `
void main() {
  vec4 t = texture2D(u_in0, vUv);
  float l = luma(t.rgb);
  vec3 c = l < 0.5
    ? mix(u_color0, u_color1, l * 2.0)
    : mix(u_color1, u_color2, l * 2.0 - 1.0);
  gl_FragColor = vec4(c, t.a);
}
`,
  },

  invert: {
    type: 'invert',
    label: 'Invert',
    category: 'Filters',
    inputs: [{ key: 'in', label: 'In', default: [0, 0, 0, 1] }],
    params: [],
    frag: /* glsl */ `
void main() {
  vec4 t = texture2D(u_in0, vUv);
  gl_FragColor = vec4(1.0 - t.rgb, t.a);
}
`,
  },

  blur: {
    type: 'blur',
    label: 'Blur',
    category: 'Filters',
    inputs: [{ key: 'in', label: 'In', default: [0, 0, 0, 1] }],
    params: [
      { key: 'radius', label: 'Radius', kind: 'float', default: 2, min: 0, max: 16, step: 0.1 },
    ],
    frag: /* glsl */ `
void main() {
  vec4 sum = vec4(0.0);
  float total = 0.0;
  for (int y = -3; y <= 3; y++) {
    for (int x = -3; x <= 3; x++) {
      vec2 o = vec2(float(x), float(y));
      float w = exp(-dot(o, o) / 6.0);
      sum += texture2D(u_in0, vUv + o * u_texel * u_radius) * w;
      total += w;
    }
  }
  gl_FragColor = sum / total;
}
`,
  },

  blend: {
    type: 'blend',
    label: 'Blend',
    category: 'Filters',
    inputs: [
      { key: 'a', label: 'A', default: [0, 0, 0, 1] },
      { key: 'b', label: 'B', default: [0, 0, 0, 1] },
      { key: 'mask', label: 'Mask', default: [1, 1, 1, 1] },
    ],
    params: [
      {
        key: 'mode', label: 'Mode', kind: 'select', default: 'mix',
        options: [
          { value: 'mix', label: 'Mix' },
          { value: 'add', label: 'Add' },
          { value: 'multiply', label: 'Multiply' },
          { value: 'screen', label: 'Screen' },
          { value: 'overlay', label: 'Overlay' },
        ],
      },
      { key: 'opacity', label: 'Opacity', kind: 'float', default: 1, min: 0, max: 1, step: 0.01 },
    ],
    frag: /* glsl */ `
void main() {
  vec4 a = texture2D(u_in0, vUv);
  vec4 b = texture2D(u_in1, vUv);
  float f = u_opacity * texture2D(u_in2, vUv).r;
  int m = int(u_mode + 0.5);
  vec3 r;
  if (m == 0) r = b.rgb;
  else if (m == 1) r = a.rgb + b.rgb;
  else if (m == 2) r = a.rgb * b.rgb;
  else if (m == 3) r = 1.0 - (1.0 - a.rgb) * (1.0 - b.rgb);
  else {
    vec3 lo = 2.0 * a.rgb * b.rgb;
    vec3 hi = 1.0 - 2.0 * (1.0 - a.rgb) * (1.0 - b.rgb);
    r = mix(lo, hi, step(vec3(0.5), a.rgb));
  }
  gl_FragColor = vec4(mix(a.rgb, clamp(r, 0.0, 1.0), f), max(a.a, b.a));
}
`,
  },

  warp: {
    type: 'warp',
    label: 'Warp',
    category: 'Filters',
    inputs: [
      { key: 'in', label: 'In', default: [0, 0, 0, 1] },
      { key: 'intensity', label: 'Intensity', default: [0.5, 0.5, 0.5, 1] },
    ],
    params: [
      { key: 'strength', label: 'Strength', kind: 'float', default: 1, min: 0, max: 3, step: 0.01 },
    ],
    frag: /* glsl */ `
void main() {
  vec2 e = u_texel * 2.0;
  float hx = texture2D(u_in1, vUv + vec2(e.x, 0.0)).r - texture2D(u_in1, vUv - vec2(e.x, 0.0)).r;
  float hy = texture2D(u_in1, vUv + vec2(0.0, e.y)).r - texture2D(u_in1, vUv - vec2(0.0, e.y)).r;
  vec2 slope = vec2(hx / (2.0 * e.x), hy / (2.0 * e.y));
  gl_FragColor = texture2D(u_in0, vUv + slope * u_strength * 0.02);
}
`,
  },

  transform: {
    type: 'transform',
    label: 'Transform',
    category: 'Filters',
    inputs: [{ key: 'in', label: 'In', default: [0, 0, 0, 1] }],
    params: [
      { key: 'scalex', label: 'Scale X', kind: 'float', default: 1, min: 0.1, max: 8, step: 0.1 },
      { key: 'scaley', label: 'Scale Y', kind: 'float', default: 1, min: 0.1, max: 8, step: 0.1 },
      { key: 'rotation', label: 'Rotation', kind: 'float', default: 0, min: -180, max: 180, step: 1 },
      { key: 'offsetx', label: 'Offset X', kind: 'float', default: 0, min: -1, max: 1, step: 0.01 },
      { key: 'offsety', label: 'Offset Y', kind: 'float', default: 0, min: -1, max: 1, step: 0.01 },
    ],
    frag: /* glsl */ `
void main() {
  vec2 uv = vUv - 0.5;
  float a = radians(u_rotation);
  mat2 R = mat2(cos(a), -sin(a), sin(a), cos(a));
  uv = R * uv * vec2(u_scalex, u_scaley);
  uv += 0.5 + vec2(u_offsetx, u_offsety);
  gl_FragColor = texture2D(u_in0, uv);
}
`,
  },

  normal: {
    type: 'normal',
    label: 'Normal Map',
    category: 'PBR',
    inputs: [{ key: 'height', label: 'Height', default: [0.5, 0.5, 0.5, 1] }],
    params: [
      { key: 'strength', label: 'Strength', kind: 'float', default: 1, min: 0, max: 5, step: 0.01 },
    ],
    frag: /* glsl */ `
void main() {
  vec2 e = u_texel;
  float hl = texture2D(u_in0, vUv - vec2(e.x, 0.0)).r;
  float hr = texture2D(u_in0, vUv + vec2(e.x, 0.0)).r;
  float hd = texture2D(u_in0, vUv - vec2(0.0, e.y)).r;
  float hu = texture2D(u_in0, vUv + vec2(0.0, e.y)).r;
  vec2 slope = vec2(hr - hl, hu - hd) / (2.0 * e);
  vec3 n = normalize(vec3(-slope * u_strength * 0.05, 1.0));
  gl_FragColor = vec4(n * 0.5 + 0.5, 1.0);
}
`,
  },

  output: {
    type: 'output',
    label: 'Output',
    category: 'PBR',
    isOutput: true,
    inputs: [{ key: 'in', label: 'In', default: [0, 0, 0, 1] }],
    params: [
      {
        key: 'channel', label: 'Channel', kind: 'select', default: 'basecolor',
        options: OUTPUT_CHANNELS.map((c) => ({ value: c, label: CHANNEL_LABELS[c as OutputChannel] })),
      },
    ],
    frag: PASSTHROUGH,
  },
};

export const NODE_CATEGORIES = ['Generators', 'Filters', 'PBR'];

export function nodesInCategory(category: string): NodeDef[] {
  return Object.values(NODE_DEFS).filter((d) => d.category === category);
}
