import { useStore } from '../store';
import { NODE_DEFS } from '../engine/nodeDefs';
import type { ParamDef } from '../types';
import Slider from './Slider';

function toHex(c: [number, number, number]): string {
  return (
    '#' +
    c
      .map((v) =>
        Math.round(Math.min(1, Math.max(0, v)) * 255)
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  );
}

function fromHex(h: string): [number, number, number] {
  return [
    parseInt(h.slice(1, 3), 16) / 255,
    parseInt(h.slice(3, 5), 16) / 255,
    parseInt(h.slice(5, 7), 16) / 255,
  ];
}

function ParamControl({
  nodeId,
  def,
  value,
}: {
  nodeId: string;
  def: ParamDef;
  value: unknown;
}) {
  const setParam = useStore((s) => s.setParam);

  if (def.kind === 'select') {
    return (
      <div className="param-row">
        <span className="param-label">{def.label}</span>
        <select value={String(value)} onChange={(e) => setParam(nodeId, def.key, e.target.value)}>
          {def.options!.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (def.kind === 'color') {
    return (
      <div className="param-row">
        <span className="param-label">{def.label}</span>
        <input
          type="color"
          value={toHex(value as [number, number, number])}
          onChange={(e) => setParam(nodeId, def.key, fromHex(e.target.value))}
        />
      </div>
    );
  }

  const num = value as number;
  const display = def.kind === 'int' ? String(num) : num.toFixed(2);
  return (
    <div className="param-row">
      <span className="param-label">{def.label}</span>
      <span className="param-value">{display}</span>
      <Slider
        min={def.min ?? 0}
        max={def.max ?? 1}
        step={def.step ?? 0.01}
        value={num}
        onChange={(v) => setParam(nodeId, def.key, v)}
      />
    </div>
  );
}

export default function Inspector() {
  const selectedId = useStore((s) => s.selectedNode);
  const node = useStore((s) => (s.selectedNode ? s.nodes[s.selectedNode] : null));
  const removeNode = useStore((s) => s.removeNode);

  return (
    <div className="panel" style={{ flex: 1 }}>
      <div className="panel-body">
        {!node || !selectedId ? (
          <div className="inspector-empty">
            Select a node to edit its parameters.
            <br />
            <br />
            Right-click the graph to add nodes.
          </div>
        ) : (
          (() => {
            const def = NODE_DEFS[node.type];
            return (
              <>
                <div className="inspector-node-title">{def.label}</div>
                <div className="inspector-node-id">ID: {node.id}</div>
                {def.params.map((p) => (
                  <ParamControl key={p.key} nodeId={node.id} def={p} value={node.params[p.key]} />
                ))}
                {def.params.length === 0 && (
                  <div className="inspector-empty">This node has no parameters.</div>
                )}
                <div className="inspector-actions">
                  <button className="danger" onClick={() => removeNode(node.id)}>
                    Delete Node
                  </button>
                </div>
              </>
            );
          })()
        )}
      </div>
    </div>
  );
}
