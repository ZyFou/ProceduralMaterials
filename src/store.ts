import { create } from 'zustand';
import type { Edge, GraphData, NodeInstance, ParamValue } from './types';
import { NODE_DEFS } from './engine/nodeDefs';

let idCounter = 0;
export function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`;
}

export function defaultParams(type: string): Record<string, ParamValue> {
  const def = NODE_DEFS[type];
  const params: Record<string, ParamValue> = {};
  for (const p of def.params) params[p.key] = p.default;
  return params;
}

export type PreviewShape = 'sphere' | 'cube' | 'plane' | 'torusknot' | 'cylinder';

interface AppState {
  materialName: string;
  nodes: Record<string, NodeInstance>;
  edges: Edge[];
  selectedNode: string | null;
  selectedEdge: string | null;
  /** bumped whenever the graph output may have changed; the engine listens to this */
  graphVersion: number;

  resolution: number;
  previewShape: PreviewShape;
  autoRotate: boolean;
  displacement: number;
  tiling: number;
  envIntensity: number;

  addNode: (type: string, x: number, y: number) => string;
  moveNode: (id: string, x: number, y: number) => void;
  removeNode: (id: string) => void;
  setParam: (id: string, key: string, value: ParamValue) => void;
  connect: (from: string, to: string, toPort: number) => void;
  removeEdge: (id: string) => void;
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  loadGraph: (graph: GraphData) => void;
  serializeGraph: () => GraphData;

  setResolution: (r: number) => void;
  setPreviewShape: (s: PreviewShape) => void;
  setAutoRotate: (v: boolean) => void;
  setDisplacement: (v: number) => void;
  setTiling: (v: number) => void;
  setEnvIntensity: (v: number) => void;
}

/** true if `target` is reachable from `start` following edges downstream */
function reaches(edges: Edge[], start: string, target: string): boolean {
  const stack = [start];
  const seen = new Set<string>();
  while (stack.length) {
    const n = stack.pop()!;
    if (n === target) return true;
    if (seen.has(n)) continue;
    seen.add(n);
    for (const e of edges) if (e.from === n) stack.push(e.to);
  }
  return false;
}

export const useStore = create<AppState>((set, get) => ({
  materialName: 'Untitled',
  nodes: {},
  edges: [],
  selectedNode: null,
  selectedEdge: null,
  graphVersion: 0,

  resolution: 512,
  previewShape: 'sphere',
  autoRotate: true,
  displacement: 0.06,
  tiling: 1,
  envIntensity: 1,

  addNode: (type, x, y) => {
    const id = nextId(type);
    const node: NodeInstance = { id, type, x, y, params: defaultParams(type) };
    set((s) => ({
      nodes: { ...s.nodes, [id]: node },
      selectedNode: id,
      selectedEdge: null,
      graphVersion: s.graphVersion + 1,
    }));
    return id;
  },

  moveNode: (id, x, y) =>
    set((s) => {
      const node = s.nodes[id];
      if (!node) return s;
      return { nodes: { ...s.nodes, [id]: { ...node, x, y } } };
    }),

  removeNode: (id) =>
    set((s) => {
      const nodes = { ...s.nodes };
      delete nodes[id];
      return {
        nodes,
        edges: s.edges.filter((e) => e.from !== id && e.to !== id),
        selectedNode: s.selectedNode === id ? null : s.selectedNode,
        graphVersion: s.graphVersion + 1,
      };
    }),

  setParam: (id, key, value) =>
    set((s) => {
      const node = s.nodes[id];
      if (!node) return s;
      return {
        nodes: { ...s.nodes, [id]: { ...node, params: { ...node.params, [key]: value } } },
        graphVersion: s.graphVersion + 1,
      };
    }),

  connect: (from, to, toPort) =>
    set((s) => {
      if (from === to) return s;
      // reject cycles: the source must not be downstream of the target
      if (reaches(s.edges, to, from)) return s;
      const edges = s.edges.filter((e) => !(e.to === to && e.toPort === toPort));
      edges.push({ id: nextId('edge'), from, to, toPort });
      return { edges, graphVersion: s.graphVersion + 1 };
    }),

  removeEdge: (id) =>
    set((s) => ({
      edges: s.edges.filter((e) => e.id !== id),
      selectedEdge: s.selectedEdge === id ? null : s.selectedEdge,
      graphVersion: s.graphVersion + 1,
    })),

  selectNode: (id) => set({ selectedNode: id, selectedEdge: null }),
  selectEdge: (id) => set({ selectedEdge: id, selectedNode: null }),

  loadGraph: (graph) =>
    set((s) => {
      const nodes: Record<string, NodeInstance> = {};
      for (const n of graph.nodes) {
        // merge stored params over defaults so older files stay loadable
        nodes[n.id] = { ...n, params: { ...defaultParams(n.type), ...n.params } };
      }
      return {
        materialName: graph.name,
        nodes,
        edges: graph.edges.map((e) => ({ ...e })),
        selectedNode: null,
        selectedEdge: null,
        graphVersion: s.graphVersion + 1,
      };
    }),

  serializeGraph: () => {
    const s = get();
    return {
      name: s.materialName,
      nodes: Object.values(s.nodes).map((n) => ({ ...n, params: { ...n.params } })),
      edges: s.edges.map((e) => ({ ...e })),
    };
  },

  setResolution: (r) => set((s) => ({ resolution: r, graphVersion: s.graphVersion + 1 })),
  setPreviewShape: (previewShape) => set({ previewShape }),
  setAutoRotate: (autoRotate) => set({ autoRotate }),
  setDisplacement: (displacement) => set({ displacement }),
  setTiling: (tiling) => set({ tiling }),
  setEnvIntensity: (envIntensity) => set({ envIntensity }),
}));
