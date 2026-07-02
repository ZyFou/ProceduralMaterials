import type { GraphData, NodeInstance, Edge, ParamValue, OutputChannel } from './types';
import { defaultParams } from './store';

const COL = 250;
const ROW = 240;

class GraphBuilder {
  private nodes: NodeInstance[] = [];
  private edges: Edge[] = [];
  private i = 0;

  constructor(private name: string) {}

  node(type: string, col: number, row: number, params: Record<string, ParamValue> = {}): string {
    this.i += 1;
    const id = `${type}_${this.i}`;
    this.nodes.push({
      id,
      type,
      x: col * COL,
      y: row * ROW,
      params: { ...defaultParams(type), ...params },
    });
    return id;
  }

  edge(from: string, to: string, toPort = 0) {
    this.i += 1;
    this.edges.push({ id: `e_${this.i}`, from, to, toPort });
  }

  /** add an output node for `channel` fed by `from` */
  out(from: string, channel: OutputChannel, col: number, row: number): string {
    const id = this.node('output', col, row, { channel });
    this.edge(from, id, 0);
    return id;
  }

  build(): GraphData {
    return { name: this.name, nodes: this.nodes, edges: this.edges };
  }
}

function weatheredRock(): GraphData {
  const b = new GraphBuilder('Weathered Rock');
  const base = b.node('noise', 0, 0, { scale: 6, octaves: 6, gain: 0.55 });
  const cells = b.node('voronoi', 0, 1, { scale: 5, mode: 'distance' });
  const warped = b.node('warp', 1, 0.5, { strength: 1.4 });
  b.edge(base, warped, 0);
  b.edge(cells, warped, 1);
  const height = b.node('levels', 2, 0.5, { inlow: 0.08, inhigh: 0.92 });
  b.edge(warped, height, 0);

  const color = b.node('colorize', 3, 0, {
    color0: [0.21, 0.19, 0.17],
    color1: [0.42, 0.39, 0.35],
    color2: [0.62, 0.59, 0.55],
  });
  b.edge(height, color, 0);
  b.out(color, 'basecolor', 4, 0);

  const nrm = b.node('normal', 3, 1, { strength: 1.6 });
  b.edge(height, nrm, 0);
  b.out(nrm, 'normal', 4, 1);
  b.out(height, 'height', 4, 2);

  const rough = b.node('levels', 3, 2, { outlow: 0.68, outhigh: 0.95 });
  b.edge(height, rough, 0);
  b.out(rough, 'roughness', 4, 3);

  const ao = b.node('levels', 3, 3, { gamma: 0.55, outlow: 0.45, outhigh: 1 });
  b.edge(height, ao, 0);
  b.out(ao, 'ao', 4, 4);
  return b.build();
}

function redBricks(): GraphData {
  const b = new GraphBuilder('Red Bricks');
  const bricks = b.node('brick', 0, 0, { columns: 4, rows: 8, variation: 0.45, mortar: 0.06, bevel: 0.08 });
  const grain = b.node('noise', 0, 1, { scale: 24, octaves: 4, gain: 0.55 });
  const mixed = b.node('blend', 1, 0.5, { mode: 'multiply', opacity: 0.4 });
  b.edge(bricks, mixed, 0);
  b.edge(grain, mixed, 1);

  const color = b.node('colorize', 2, 0, {
    color0: [0.56, 0.53, 0.48],
    color1: [0.45, 0.2, 0.15],
    color2: [0.68, 0.34, 0.24],
  });
  b.edge(mixed, color, 0);
  b.out(color, 'basecolor', 3, 0);

  const nrm = b.node('normal', 2, 1, { strength: 2.2 });
  b.edge(mixed, nrm, 0);
  b.out(nrm, 'normal', 3, 1);
  b.out(mixed, 'height', 3, 2);

  const rough = b.node('levels', 2, 2, { outlow: 0.7, outhigh: 0.92 });
  b.edge(mixed, rough, 0);
  b.out(rough, 'roughness', 3, 3);

  const ao = b.node('levels', 2, 3, { gamma: 0.6, outlow: 0.4, outhigh: 1 });
  b.edge(bricks, ao, 0);
  b.out(ao, 'ao', 3, 4);
  return b.build();
}

function marble(): GraphData {
  const b = new GraphBuilder('Marble');
  const flow = b.node('noise', 0, 0, { scale: 4, octaves: 5, gain: 0.6 });
  const veins = b.node('noise', 0, 1, { ntype: 'ridged', scale: 3, octaves: 5, gain: 0.55, seed: 7 });
  const warped = b.node('warp', 1, 0.5, { strength: 2.6 });
  b.edge(veins, warped, 0);
  b.edge(flow, warped, 1);
  const sharpen = b.node('levels', 2, 0.5, { inlow: 0.55, inhigh: 0.95, gamma: 1.4 });
  b.edge(warped, sharpen, 0);

  const color = b.node('colorize', 3, 0, {
    color0: [0.93, 0.93, 0.91],
    color1: [0.82, 0.83, 0.85],
    color2: [0.35, 0.37, 0.42],
  });
  b.edge(sharpen, color, 0);
  b.out(color, 'basecolor', 4, 0);

  const rough = b.node('levels', 3, 1, { outlow: 0.12, outhigh: 0.28 });
  b.edge(sharpen, rough, 0);
  b.out(rough, 'roughness', 4, 1);

  const nrm = b.node('normal', 3, 2, { strength: 0.25 });
  b.edge(sharpen, nrm, 0);
  b.out(nrm, 'normal', 4, 2);
  return b.build();
}

function rustedSteel(): GraphData {
  const b = new GraphBuilder('Rusted Steel');
  const maskNoise = b.node('noise', 0, 0, { scale: 5, octaves: 6, gain: 0.6, seed: 3 });
  const mask = b.node('levels', 1, 0, { inlow: 0.42, inhigh: 0.72 });
  b.edge(maskNoise, mask, 0);

  const steel = b.node('color', 0, 1, { color: [0.56, 0.59, 0.62] });
  const rustNoise = b.node('noise', 0, 2, { scale: 14, octaves: 5, seed: 11 });
  const rustColor = b.node('colorize', 1, 2, {
    color0: [0.29, 0.14, 0.06],
    color1: [0.49, 0.23, 0.09],
    color2: [0.64, 0.35, 0.17],
  });
  b.edge(rustNoise, rustColor, 0);

  const baseBlend = b.node('blend', 2, 1, { mode: 'mix', opacity: 1 });
  b.edge(steel, baseBlend, 0);
  b.edge(rustColor, baseBlend, 1);
  b.edge(mask, baseBlend, 2);
  b.out(baseBlend, 'basecolor', 3, 0);

  const metal = b.node('invert', 2, 2, {});
  b.edge(mask, metal, 0);
  b.out(metal, 'metalness', 3, 1);

  const rough = b.node('levels', 2, 3, { outlow: 0.3, outhigh: 0.92 });
  b.edge(mask, rough, 0);
  b.out(rough, 'roughness', 3, 2);

  const bump = b.node('blend', 2, 4, { mode: 'multiply', opacity: 1 });
  b.edge(rustNoise, bump, 0);
  b.edge(mask, bump, 1);
  const nrm = b.node('normal', 3, 4, { strength: 1.2 });
  b.edge(bump, nrm, 0);
  b.out(nrm, 'normal', 4, 3);
  b.out(bump, 'height', 4, 4);
  return b.build();
}

function polishedGold(): GraphData {
  const b = new GraphBuilder('Polished Gold');
  const gold = b.node('color', 0, 0, { color: [1.0, 0.78, 0.34] });
  b.out(gold, 'basecolor', 2, 0);

  const metal = b.node('value', 0, 1, { value: 1 });
  b.out(metal, 'metalness', 2, 1);

  const smudge = b.node('noise', 0, 2, { scale: 10, octaves: 3, gain: 0.5 });
  const rough = b.node('levels', 1, 2, { outlow: 0.08, outhigh: 0.3 });
  b.edge(smudge, rough, 0);
  b.out(rough, 'roughness', 2, 2);

  const nrm = b.node('normal', 1, 3, { strength: 0.12 });
  b.edge(smudge, nrm, 0);
  b.out(nrm, 'normal', 2, 3);
  return b.build();
}

function lavaFlow(): GraphData {
  const b = new GraphBuilder('Lava Flow');
  const cracks = b.node('noise', 0, 0, { ntype: 'ridged', scale: 5, octaves: 6, gain: 0.55 });
  const flow = b.node('noise', 0, 1, { scale: 4, octaves: 4, seed: 5 });
  const warped = b.node('warp', 1, 0.5, { strength: 1.8 });
  b.edge(cracks, warped, 0);
  b.edge(flow, warped, 1);

  const color = b.node('colorize', 2, 0, {
    color0: [0.09, 0.07, 0.06],
    color1: [0.22, 0.14, 0.1],
    color2: [1.0, 0.35, 0.08],
  });
  b.edge(warped, color, 0);
  b.out(color, 'basecolor', 3, 0);

  const glowMask = b.node('levels', 2, 1, { inlow: 0.62, inhigh: 0.95 });
  b.edge(warped, glowMask, 0);
  const glow = b.node('colorize', 3, 1, {
    color0: [0, 0, 0],
    color1: [0.9, 0.22, 0.02],
    color2: [1.0, 0.72, 0.2],
  });
  b.edge(glowMask, glow, 0);
  b.out(glow, 'emissive', 4, 1);

  const inv = b.node('invert', 2, 2, {});
  b.edge(warped, inv, 0);
  b.out(inv, 'height', 3, 2);
  const nrm = b.node('normal', 3, 3, { strength: 1.4 });
  b.edge(inv, nrm, 0);
  b.out(nrm, 'normal', 4, 3);

  const rough = b.node('levels', 3, 4, { outlow: 0.55, outhigh: 0.9 });
  b.edge(inv, rough, 0);
  b.out(rough, 'roughness', 4, 4);
  return b.build();
}

export interface Preset {
  name: string;
  tags: string[];
  build: () => GraphData;
}

export const PRESETS: Preset[] = [
  { name: 'Weathered Rock', tags: ['nature', 'stone'], build: weatheredRock },
  { name: 'Red Bricks', tags: ['buildings'], build: redBricks },
  { name: 'Marble', tags: ['stone', 'interior'], build: marble },
  { name: 'Rusted Steel', tags: ['metal', 'worn'], build: rustedSteel },
  { name: 'Polished Gold', tags: ['metal'], build: polishedGold },
  { name: 'Lava Flow', tags: ['nature', 'emissive'], build: lavaFlow },
];
