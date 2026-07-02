export type ParamValue = number | string | [number, number, number];

export interface NodeInstance {
  id: string;
  type: string;
  x: number;
  y: number;
  params: Record<string, ParamValue>;
}

export interface Edge {
  id: string;
  /** source node id (nodes have a single output) */
  from: string;
  /** target node id */
  to: string;
  /** input index on the target node */
  toPort: number;
}

export interface GraphData {
  name: string;
  nodes: NodeInstance[];
  edges: Edge[];
}

export interface GraphViewport {
  tx: number;
  ty: number;
  k: number;
}

export interface LayoutData {
  version: 1;
  graphView: GraphViewport;
  resolution: number;
  previewShape: string;
  autoRotate: boolean;
  displacement: number;
  tiling: number;
  envIntensity: number;
}

export type ParamKind = 'float' | 'int' | 'select' | 'color';

export interface ParamDef {
  key: string;
  label: string;
  kind: ParamKind;
  default: ParamValue;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
}

export interface InputDef {
  key: string;
  label: string;
  /** RGBA fallback sampled when the input is not connected */
  default: [number, number, number, number];
}

export interface NodeDef {
  type: string;
  label: string;
  category: string;
  inputs: InputDef[];
  params: ParamDef[];
  /** fragment shader body; omitted for the output node (passthrough) */
  frag: string;
  isOutput?: boolean;
}

export const OUTPUT_CHANNELS = [
  'basecolor',
  'normal',
  'roughness',
  'metalness',
  'height',
  'ao',
  'emissive',
] as const;

export type OutputChannel = (typeof OUTPUT_CHANNELS)[number];

export const CHANNEL_LABELS: Record<OutputChannel, string> = {
  basecolor: 'Base Color',
  normal: 'Normal',
  roughness: 'Roughness',
  metalness: 'Metalness',
  height: 'Height',
  ao: 'Ambient Occlusion',
  emissive: 'Emissive',
};
