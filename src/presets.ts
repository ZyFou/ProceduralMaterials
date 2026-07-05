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

function oakPlanks(): GraphData {
  const b = new GraphBuilder('Oak Planks');
  const grain = b.node('noise', 0, 0, { scale: 6, octaves: 6, gain: 0.55, seed: 9 });
  const stretched = b.node('transform', 1, 0, { scalex: 1, scaley: 8 });
  b.edge(grain, stretched, 0);
  const planks = b.node('brick', 0, 1, { columns: 1, rows: 5, offset: 0, mortar: 0.02, bevel: 0.035, variation: 0.4, seed: 4 });
  const h = b.node('blend', 2, 0.5, { mode: 'multiply', opacity: 0.55 });
  b.edge(planks, h, 0);
  b.edge(stretched, h, 1);

  const color = b.node('colorize', 3, 0, {
    color0: [0.24, 0.14, 0.07],
    color1: [0.45, 0.28, 0.15],
    color2: [0.65, 0.47, 0.28],
  });
  b.edge(h, color, 0);
  b.out(color, 'basecolor', 4, 0);

  const nrm = b.node('normal', 3, 1, { strength: 1.4 });
  b.edge(h, nrm, 0);
  b.out(nrm, 'normal', 4, 1);
  b.out(h, 'height', 4, 2);

  const rough = b.node('levels', 3, 2, { outlow: 0.45, outhigh: 0.72 });
  b.edge(h, rough, 0);
  b.out(rough, 'roughness', 4, 3);

  const ao = b.node('levels', 3, 3, { gamma: 0.6, outlow: 0.5, outhigh: 1 });
  b.edge(planks, ao, 0);
  b.out(ao, 'ao', 4, 4);
  return b.build();
}

function treeBark(): GraphData {
  const b = new GraphBuilder('Tree Bark');
  const ridges = b.node('noise', 0, 0, { ntype: 'ridged', scale: 5, octaves: 6, gain: 0.6, seed: 17 });
  const stretched = b.node('transform', 1, 0, { scalex: 6, scaley: 1 });
  b.edge(ridges, stretched, 0);
  const detail = b.node('noise', 0, 1, { scale: 20, octaves: 5, gain: 0.55, seed: 3 });
  const h = b.node('blend', 2, 0.5, { mode: 'multiply', opacity: 0.45 });
  b.edge(stretched, h, 0);
  b.edge(detail, h, 1);

  const color = b.node('colorize', 3, 0, {
    color0: [0.13, 0.09, 0.06],
    color1: [0.28, 0.2, 0.13],
    color2: [0.46, 0.37, 0.26],
  });
  b.edge(h, color, 0);
  b.out(color, 'basecolor', 4, 0);

  const nrm = b.node('normal', 3, 1, { strength: 2.6 });
  b.edge(h, nrm, 0);
  b.out(nrm, 'normal', 4, 1);
  b.out(h, 'height', 4, 2);

  const rough = b.node('levels', 3, 2, { outlow: 0.8, outhigh: 0.96 });
  b.edge(h, rough, 0);
  b.out(rough, 'roughness', 4, 3);

  const ao = b.node('levels', 3, 3, { gamma: 0.55, outlow: 0.4, outhigh: 1 });
  b.edge(h, ao, 0);
  b.out(ao, 'ao', 4, 4);
  return b.build();
}

function sandDunes(): GraphData {
  const b = new GraphBuilder('Sand Dunes');
  const dunes = b.node('noise', 0, 0, { ntype: 'billow', scale: 3, octaves: 3, gain: 0.45, seed: 6 });
  const grains = b.node('noise', 0, 1, { scale: 48, octaves: 2, gain: 0.5, seed: 4 });
  const h = b.node('blend', 1, 0.5, { mode: 'overlay', opacity: 0.2 });
  b.edge(dunes, h, 0);
  b.edge(grains, h, 1);

  const color = b.node('colorize', 2, 0, {
    color0: [0.72, 0.57, 0.38],
    color1: [0.85, 0.72, 0.51],
    color2: [0.95, 0.87, 0.68],
  });
  b.edge(h, color, 0);
  b.out(color, 'basecolor', 3, 0);

  const nrm = b.node('normal', 2, 1, { strength: 0.9 });
  b.edge(h, nrm, 0);
  b.out(nrm, 'normal', 3, 1);
  b.out(h, 'height', 3, 2);

  const rough = b.node('levels', 2, 2, { outlow: 0.85, outhigh: 1 });
  b.edge(h, rough, 0);
  b.out(rough, 'roughness', 3, 3);
  return b.build();
}

function crackedMud(): GraphData {
  const b = new GraphBuilder('Cracked Mud');
  const plates = b.node('voronoi', 0, 0, { mode: 'edges', scale: 7, randomness: 1, seed: 2 });
  const flow = b.node('noise', 0, 1, { scale: 6, octaves: 4, seed: 8 });
  const warped = b.node('warp', 1, 0.5, { strength: 0.9 });
  b.edge(plates, warped, 0);
  b.edge(flow, warped, 1);
  const dirt = b.node('noise', 0, 2, { scale: 16, octaves: 5, gain: 0.55, seed: 5 });
  const h = b.node('blend', 2, 0.5, { mode: 'multiply', opacity: 0.35 });
  b.edge(warped, h, 0);
  b.edge(dirt, h, 1);

  const color = b.node('colorize', 3, 0, {
    color0: [0.28, 0.2, 0.14],
    color1: [0.46, 0.35, 0.25],
    color2: [0.62, 0.52, 0.4],
  });
  b.edge(h, color, 0);
  b.out(color, 'basecolor', 4, 0);

  const nrm = b.node('normal', 3, 1, { strength: 2.2 });
  b.edge(h, nrm, 0);
  b.out(nrm, 'normal', 4, 1);
  b.out(h, 'height', 4, 2);

  const rough = b.node('levels', 3, 2, { outlow: 0.78, outhigh: 0.98 });
  b.edge(h, rough, 0);
  b.out(rough, 'roughness', 4, 3);

  const ao = b.node('levels', 3, 3, { gamma: 0.5, outlow: 0.35, outhigh: 1 });
  b.edge(warped, ao, 0);
  b.out(ao, 'ao', 4, 4);
  return b.build();
}

function mossyGround(): GraphData {
  const b = new GraphBuilder('Mossy Ground');
  const clumps = b.node('noise', 0, 0, { ntype: 'billow', scale: 9, octaves: 6, gain: 0.6, seed: 14 });
  const fine = b.node('noise', 0, 1, { scale: 40, octaves: 3, gain: 0.55, seed: 2 });
  const h = b.node('blend', 1, 0.5, { mode: 'overlay', opacity: 0.5 });
  b.edge(clumps, h, 0);
  b.edge(fine, h, 1);

  const color = b.node('colorize', 2, 0, {
    color0: [0.07, 0.13, 0.05],
    color1: [0.19, 0.32, 0.1],
    color2: [0.42, 0.53, 0.21],
  });
  b.edge(h, color, 0);
  b.out(color, 'basecolor', 3, 0);

  const nrm = b.node('normal', 2, 1, { strength: 1.8 });
  b.edge(h, nrm, 0);
  b.out(nrm, 'normal', 3, 1);
  b.out(h, 'height', 3, 2);

  const rough = b.node('levels', 2, 2, { outlow: 0.88, outhigh: 1 });
  b.edge(h, rough, 0);
  b.out(rough, 'roughness', 3, 3);

  const ao = b.node('levels', 2, 3, { gamma: 0.6, outlow: 0.45, outhigh: 1 });
  b.edge(h, ao, 0);
  b.out(ao, 'ao', 3, 4);
  return b.build();
}

function freshSnow(): GraphData {
  const b = new GraphBuilder('Fresh Snow');
  const drifts = b.node('noise', 0, 0, { ntype: 'billow', scale: 5, octaves: 4, gain: 0.5, seed: 19 });
  const sparkleCells = b.node('voronoi', 0, 1, { mode: 'cells', scale: 48, randomness: 1, seed: 7 });
  const sparkles = b.node('levels', 1, 1, { inlow: 0.9, inhigh: 0.97 });
  b.edge(sparkleCells, sparkles, 0);

  const color = b.node('colorize', 1, 0, {
    color0: [0.78, 0.83, 0.9],
    color1: [0.92, 0.94, 0.97],
    color2: [1, 1, 1],
  });
  b.edge(drifts, color, 0);
  b.out(color, 'basecolor', 3, 0);

  const roughBase = b.node('value', 0, 2, { value: 0.62 });
  const roughGlint = b.node('value', 0, 3, { value: 0.1 });
  const rough = b.node('blend', 2, 2, { mode: 'mix', opacity: 1 });
  b.edge(roughBase, rough, 0);
  b.edge(roughGlint, rough, 1);
  b.edge(sparkles, rough, 2);
  b.out(rough, 'roughness', 3, 1);

  const nrm = b.node('normal', 2, 3, { strength: 0.6 });
  b.edge(drifts, nrm, 0);
  b.out(nrm, 'normal', 3, 2);
  b.out(drifts, 'height', 3, 3);
  return b.build();
}

function blueIce(): GraphData {
  const b = new GraphBuilder('Blue Ice');
  const veins = b.node('noise', 0, 0, { ntype: 'ridged', scale: 4, octaves: 6, gain: 0.55, seed: 12 });
  const flow = b.node('noise', 0, 1, { scale: 5, octaves: 4, seed: 1 });
  const warped = b.node('warp', 1, 0.5, { strength: 2.2 });
  b.edge(veins, warped, 0);
  b.edge(flow, warped, 1);

  const color = b.node('colorize', 2, 0, {
    color0: [0.14, 0.3, 0.45],
    color1: [0.42, 0.63, 0.78],
    color2: [0.88, 0.96, 1],
  });
  b.edge(warped, color, 0);
  b.out(color, 'basecolor', 3, 0);

  const rough = b.node('levels', 2, 1, { outlow: 0.04, outhigh: 0.2 });
  b.edge(warped, rough, 0);
  b.out(rough, 'roughness', 3, 1);

  const nrm = b.node('normal', 2, 2, { strength: 0.5 });
  b.edge(warped, nrm, 0);
  b.out(nrm, 'normal', 3, 2);
  b.out(warped, 'height', 3, 3);
  return b.build();
}

function oceanWater(): GraphData {
  const b = new GraphBuilder('Ocean Water');
  const swells = b.node('noise', 0, 0, { scale: 6, octaves: 5, gain: 0.55, seed: 4 });
  const ripples = b.node('noise', 0, 1, { scale: 24, octaves: 4, gain: 0.5, seed: 3 });
  const h = b.node('blend', 1, 0.5, { mode: 'overlay', opacity: 0.4 });
  b.edge(swells, h, 0);
  b.edge(ripples, h, 1);

  const color = b.node('colorize', 2, 0, {
    color0: [0.02, 0.08, 0.15],
    color1: [0.05, 0.2, 0.32],
    color2: [0.16, 0.45, 0.55],
  });
  b.edge(h, color, 0);
  b.out(color, 'basecolor', 3, 0);

  const rough = b.node('levels', 2, 1, { outlow: 0.02, outhigh: 0.12 });
  b.edge(ripples, rough, 0);
  b.out(rough, 'roughness', 3, 1);

  const nrm = b.node('normal', 2, 2, { strength: 0.8 });
  b.edge(h, nrm, 0);
  b.out(nrm, 'normal', 3, 2);
  b.out(h, 'height', 3, 3);
  return b.build();
}

function polishedGranite(): GraphData {
  const b = new GraphBuilder('Polished Granite');
  const speckles = b.node('voronoi', 0, 0, { mode: 'cells', scale: 32, randomness: 1, seed: 9 });
  const clouds = b.node('noise', 0, 1, { scale: 5, octaves: 5, gain: 0.55, seed: 6 });
  const mixed = b.node('blend', 1, 0.5, { mode: 'overlay', opacity: 0.55 });
  b.edge(speckles, mixed, 0);
  b.edge(clouds, mixed, 1);

  const color = b.node('colorize', 2, 0, {
    color0: [0.1, 0.09, 0.1],
    color1: [0.36, 0.31, 0.3],
    color2: [0.66, 0.6, 0.56],
  });
  b.edge(mixed, color, 0);
  b.out(color, 'basecolor', 3, 0);

  const rough = b.node('levels', 2, 1, { outlow: 0.15, outhigh: 0.3 });
  b.edge(mixed, rough, 0);
  b.out(rough, 'roughness', 3, 1);

  const nrm = b.node('normal', 2, 2, { strength: 0.3 });
  b.edge(mixed, nrm, 0);
  b.out(nrm, 'normal', 3, 2);
  return b.build();
}

function roughConcrete(): GraphData {
  const b = new GraphBuilder('Rough Concrete');
  const base = b.node('noise', 0, 0, { scale: 10, octaves: 6, gain: 0.55, seed: 13 });
  const pores = b.node('voronoi', 0, 1, { mode: 'distance', scale: 40, randomness: 1, seed: 5 });
  const pits = b.node('levels', 1, 1, { inlow: 0.05, inhigh: 0.5 });
  b.edge(pores, pits, 0);
  const h = b.node('blend', 2, 0.5, { mode: 'multiply', opacity: 0.3 });
  b.edge(base, h, 0);
  b.edge(pits, h, 1);

  const color = b.node('colorize', 3, 0, {
    color0: [0.42, 0.42, 0.41],
    color1: [0.56, 0.56, 0.54],
    color2: [0.7, 0.7, 0.68],
  });
  b.edge(h, color, 0);
  b.out(color, 'basecolor', 4, 0);

  const nrm = b.node('normal', 3, 1, { strength: 1.1 });
  b.edge(h, nrm, 0);
  b.out(nrm, 'normal', 4, 1);
  b.out(h, 'height', 4, 2);

  const rough = b.node('levels', 3, 2, { outlow: 0.75, outhigh: 0.95 });
  b.edge(h, rough, 0);
  b.out(rough, 'roughness', 4, 3);

  const ao = b.node('levels', 3, 3, { gamma: 0.65, outlow: 0.55, outhigh: 1 });
  b.edge(h, ao, 0);
  b.out(ao, 'ao', 4, 4);
  return b.build();
}

function asphalt(): GraphData {
  const b = new GraphBuilder('Asphalt');
  const aggregate = b.node('voronoi', 0, 0, { mode: 'distance', scale: 48, randomness: 1, seed: 11 });
  const bumps = b.node('invert', 1, 0, {});
  b.edge(aggregate, bumps, 0);
  const patches = b.node('noise', 0, 1, { scale: 6, octaves: 4, gain: 0.5, seed: 7 });
  const h = b.node('blend', 2, 0.5, { mode: 'multiply', opacity: 0.5 });
  b.edge(bumps, h, 0);
  b.edge(patches, h, 1);

  const color = b.node('colorize', 3, 0, {
    color0: [0.05, 0.05, 0.06],
    color1: [0.12, 0.12, 0.13],
    color2: [0.24, 0.24, 0.26],
  });
  b.edge(h, color, 0);
  b.out(color, 'basecolor', 4, 0);

  const nrm = b.node('normal', 3, 1, { strength: 1.6 });
  b.edge(h, nrm, 0);
  b.out(nrm, 'normal', 4, 1);
  b.out(h, 'height', 4, 2);

  const rough = b.node('levels', 3, 2, { outlow: 0.85, outhigh: 1 });
  b.edge(h, rough, 0);
  b.out(rough, 'roughness', 4, 3);
  return b.build();
}

function ceramicTiles(): GraphData {
  const b = new GraphBuilder('Ceramic Tiles');
  const tiles = b.node('brick', 0, 0, { columns: 6, rows: 6, offset: 0, mortar: 0.04, bevel: 0.05, variation: 0.12, seed: 3 });

  const color = b.node('colorize', 1, 0, {
    color0: [0.34, 0.35, 0.37],
    color1: [0.82, 0.85, 0.86],
    color2: [0.94, 0.96, 0.97],
  });
  b.edge(tiles, color, 0);
  b.out(color, 'basecolor', 2, 0);

  const inv = b.node('invert', 1, 1, {});
  b.edge(tiles, inv, 0);
  const rough = b.node('levels', 2, 1, { outlow: 0.07, outhigh: 0.65 });
  b.edge(inv, rough, 0);
  b.out(rough, 'roughness', 3, 1);

  const nrm = b.node('normal', 1, 2, { strength: 1.3 });
  b.edge(tiles, nrm, 0);
  b.out(nrm, 'normal', 2, 2);
  b.out(tiles, 'height', 2, 3);

  const ao = b.node('levels', 1, 3, { gamma: 0.7, outlow: 0.55, outhigh: 1 });
  b.edge(tiles, ao, 0);
  b.out(ao, 'ao', 2, 4);
  return b.build();
}

function brushedSteel(): GraphData {
  const b = new GraphBuilder('Brushed Steel');
  const streaks = b.node('noise', 0, 0, { scale: 8, octaves: 6, gain: 0.7, seed: 15 });
  const brushed = b.node('transform', 1, 0, { scalex: 1, scaley: 8 });
  b.edge(streaks, brushed, 0);

  const color = b.node('colorize', 2, 0, {
    color0: [0.42, 0.44, 0.47],
    color1: [0.58, 0.6, 0.63],
    color2: [0.75, 0.77, 0.8],
  });
  b.edge(brushed, color, 0);
  b.out(color, 'basecolor', 3, 0);

  const metal = b.node('value', 0, 1, { value: 1 });
  b.out(metal, 'metalness', 3, 1);

  const rough = b.node('levels', 2, 2, { outlow: 0.25, outhigh: 0.45 });
  b.edge(brushed, rough, 0);
  b.out(rough, 'roughness', 3, 2);

  const nrm = b.node('normal', 2, 3, { strength: 0.35 });
  b.edge(brushed, nrm, 0);
  b.out(nrm, 'normal', 3, 3);
  return b.build();
}

function copperPatina(): GraphData {
  const b = new GraphBuilder('Copper Patina');
  const maskNoise = b.node('noise', 0, 0, { scale: 6, octaves: 6, gain: 0.6, seed: 21 });
  const mask = b.node('levels', 1, 0, { inlow: 0.4, inhigh: 0.68 });
  b.edge(maskNoise, mask, 0);

  const copper = b.node('color', 0, 1, { color: [0.85, 0.45, 0.3] });
  const patinaNoise = b.node('noise', 0, 2, { scale: 12, octaves: 5, gain: 0.55, seed: 8 });
  const patinaColor = b.node('colorize', 1, 2, {
    color0: [0.16, 0.42, 0.38],
    color1: [0.27, 0.58, 0.5],
    color2: [0.45, 0.74, 0.62],
  });
  b.edge(patinaNoise, patinaColor, 0);

  const baseBlend = b.node('blend', 2, 1, { mode: 'mix', opacity: 1 });
  b.edge(copper, baseBlend, 0);
  b.edge(patinaColor, baseBlend, 1);
  b.edge(mask, baseBlend, 2);
  b.out(baseBlend, 'basecolor', 3, 0);

  const metal = b.node('invert', 2, 2, {});
  b.edge(mask, metal, 0);
  b.out(metal, 'metalness', 3, 1);

  const rough = b.node('levels', 2, 3, { outlow: 0.25, outhigh: 0.8 });
  b.edge(mask, rough, 0);
  b.out(rough, 'roughness', 3, 2);

  const bump = b.node('blend', 2, 4, { mode: 'multiply', opacity: 1 });
  b.edge(patinaNoise, bump, 0);
  b.edge(mask, bump, 1);
  const nrm = b.node('normal', 3, 4, { strength: 0.9 });
  b.edge(bump, nrm, 0);
  b.out(nrm, 'normal', 4, 3);
  b.out(bump, 'height', 4, 4);
  return b.build();
}

function wornLeather(): GraphData {
  const b = new GraphBuilder('Worn Leather');
  const pores = b.node('voronoi', 0, 0, { mode: 'edges', scale: 28, randomness: 1, seed: 4 });
  const wrinkles = b.node('noise', 0, 1, { scale: 6, octaves: 5, gain: 0.55, seed: 10 });
  const h = b.node('blend', 1, 0.5, { mode: 'multiply', opacity: 0.4 });
  b.edge(pores, h, 0);
  b.edge(wrinkles, h, 1);

  const color = b.node('colorize', 2, 0, {
    color0: [0.19, 0.1, 0.06],
    color1: [0.38, 0.2, 0.11],
    color2: [0.55, 0.33, 0.19],
  });
  b.edge(h, color, 0);
  b.out(color, 'basecolor', 3, 0);

  const nrm = b.node('normal', 2, 1, { strength: 1.3 });
  b.edge(h, nrm, 0);
  b.out(nrm, 'normal', 3, 1);
  b.out(h, 'height', 3, 2);

  const rough = b.node('levels', 2, 2, { outlow: 0.5, outhigh: 0.75 });
  b.edge(h, rough, 0);
  b.out(rough, 'roughness', 3, 3);

  const ao = b.node('levels', 2, 3, { gamma: 0.6, outlow: 0.5, outhigh: 1 });
  b.edge(h, ao, 0);
  b.out(ao, 'ao', 3, 4);
  return b.build();
}

function wovenFabric(): GraphData {
  const b = new GraphBuilder('Woven Fabric');
  const weave = b.node('checker', 0, 0, { scale: 40 });
  const soft = b.node('blur', 1, 0, { radius: 1.2 });
  b.edge(weave, soft, 0);
  const fibers = b.node('noise', 0, 1, { scale: 32, octaves: 3, gain: 0.55, seed: 6 });
  const h = b.node('blend', 2, 0.5, { mode: 'overlay', opacity: 0.5 });
  b.edge(soft, h, 0);
  b.edge(fibers, h, 1);

  const color = b.node('colorize', 3, 0, {
    color0: [0.1, 0.14, 0.28],
    color1: [0.2, 0.28, 0.48],
    color2: [0.4, 0.5, 0.68],
  });
  b.edge(h, color, 0);
  b.out(color, 'basecolor', 4, 0);

  const nrm = b.node('normal', 3, 1, { strength: 1.1 });
  b.edge(h, nrm, 0);
  b.out(nrm, 'normal', 4, 1);

  const rough = b.node('levels', 3, 2, { outlow: 0.85, outhigh: 1 });
  b.edge(h, rough, 0);
  b.out(rough, 'roughness', 4, 2);
  return b.build();
}

function sciFiPanels(): GraphData {
  const b = new GraphBuilder('Sci-Fi Panels');
  const panels = b.node('brick', 0, 0, { columns: 5, rows: 5, offset: 0.5, mortar: 0.03, bevel: 0.04, variation: 0.3, seed: 12 });
  const scratches = b.node('noise', 0, 1, { scale: 20, octaves: 5, gain: 0.55, seed: 9 });
  const h = b.node('blend', 1, 0.5, { mode: 'multiply', opacity: 0.3 });
  b.edge(panels, h, 0);
  b.edge(scratches, h, 1);

  const color = b.node('colorize', 2, 0, {
    color0: [0.09, 0.1, 0.12],
    color1: [0.22, 0.24, 0.28],
    color2: [0.42, 0.45, 0.52],
  });
  b.edge(h, color, 0);
  b.out(color, 'basecolor', 3, 0);

  const metal = b.node('value', 0, 2, { value: 1 });
  b.out(metal, 'metalness', 3, 1);

  const rough = b.node('levels', 2, 2, { outlow: 0.3, outhigh: 0.6 });
  b.edge(h, rough, 0);
  b.out(rough, 'roughness', 3, 2);

  const nrm = b.node('normal', 2, 3, { strength: 2 });
  b.edge(h, nrm, 0);
  b.out(nrm, 'normal', 3, 3);
  b.out(h, 'height', 3, 4);

  const seams = b.node('invert', 1, 4, {});
  b.edge(panels, seams, 0);
  const glowMask = b.node('levels', 2, 4, { inlow: 0.82, inhigh: 1 });
  b.edge(seams, glowMask, 0);
  const glow = b.node('colorize', 3, 5, {
    color0: [0, 0, 0],
    color1: [0, 0.35, 0.5],
    color2: [0.25, 0.95, 1],
  });
  b.edge(glowMask, glow, 0);
  b.out(glow, 'emissive', 4, 5);
  return b.build();
}

export interface Preset {
  name: string;
  tags: string[];
  build: () => GraphData;
}

export const PRESETS: Preset[] = [
  // natural
  { name: 'Weathered Rock', tags: ['nature', 'stone'], build: weatheredRock },
  { name: 'Polished Granite', tags: ['nature', 'stone', 'interior'], build: polishedGranite },
  { name: 'Marble', tags: ['stone', 'interior'], build: marble },
  { name: 'Tree Bark', tags: ['nature', 'wood'], build: treeBark },
  { name: 'Mossy Ground', tags: ['nature', 'ground'], build: mossyGround },
  { name: 'Sand Dunes', tags: ['nature', 'ground'], build: sandDunes },
  { name: 'Cracked Mud', tags: ['nature', 'ground'], build: crackedMud },
  { name: 'Fresh Snow', tags: ['nature', 'winter'], build: freshSnow },
  { name: 'Blue Ice', tags: ['nature', 'winter'], build: blueIce },
  { name: 'Ocean Water', tags: ['nature', 'water'], build: oceanWater },
  { name: 'Lava Flow', tags: ['nature', 'emissive'], build: lavaFlow },
  // artificial
  { name: 'Red Bricks', tags: ['buildings'], build: redBricks },
  { name: 'Rough Concrete', tags: ['buildings', 'worn'], build: roughConcrete },
  { name: 'Asphalt', tags: ['buildings', 'ground'], build: asphalt },
  { name: 'Ceramic Tiles', tags: ['buildings', 'interior'], build: ceramicTiles },
  { name: 'Oak Planks', tags: ['wood', 'interior'], build: oakPlanks },
  { name: 'Worn Leather', tags: ['fabric', 'worn'], build: wornLeather },
  { name: 'Woven Fabric', tags: ['fabric', 'interior'], build: wovenFabric },
  { name: 'Rusted Steel', tags: ['metal', 'worn'], build: rustedSteel },
  { name: 'Brushed Steel', tags: ['metal'], build: brushedSteel },
  { name: 'Copper Patina', tags: ['metal', 'worn'], build: copperPatina },
  { name: 'Polished Gold', tags: ['metal'], build: polishedGold },
  { name: 'Sci-Fi Panels', tags: ['metal', 'scifi', 'emissive'], build: sciFiPanels },
];
