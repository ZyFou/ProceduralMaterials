import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import { NODE_DEFS, NODE_CATEGORIES, nodesInCategory } from '../engine/nodeDefs';
import { engine } from '../engine/Engine';
import { CHANNEL_LABELS } from '../types';
import type { NodeInstance, OutputChannel } from '../types';

export const NODE_WIDTH = 180;
const HEADER_H = 28;
const THUMB_H = 108;
const PORT_ROW_H = 22;

function outPortPos(n: NodeInstance) {
  return { x: n.x + NODE_WIDTH, y: n.y + 14 };
}

function inPortPos(n: NodeInstance, port: number) {
  return { x: n.x, y: n.y + HEADER_H + THUMB_H + port * PORT_ROW_H + PORT_ROW_H / 2 };
}

function edgePath(x1: number, y1: number, x2: number, y2: number): string {
  const c = Math.max(40, Math.abs(x2 - x1) * 0.5);
  return `M ${x1} ${y1} C ${x1 + c} ${y1}, ${x2 - c} ${y2}, ${x2} ${y2}`;
}

interface View {
  tx: number;
  ty: number;
  k: number;
}

interface Pending {
  from: string;
  x: number;
  y: number;
}

interface MenuState {
  sx: number;
  sy: number;
  wx: number;
  wy: number;
}

/** thumbnail canvas that registers itself with the engine */
function NodeThumb({ nodeId }: { nodeId: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    engine.registerThumb(nodeId, ref.current);
    return () => engine.registerThumb(nodeId, null);
  }, [nodeId]);
  return <canvas className="node-thumb" ref={ref} width={96} height={96} />;
}

function AddNodeMenu({
  menu,
  onPick,
  onClose,
}: {
  menu: MenuState;
  onPick: (type: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => inputRef.current?.focus(), []);

  const q = query.trim().toLowerCase();
  const groups = NODE_CATEGORIES.map((cat) => ({
    cat,
    items: nodesInCategory(cat).filter((d) => !q || d.label.toLowerCase().includes(q)),
  })).filter((g) => g.items.length > 0);
  const flat = groups.flatMap((g) => g.items);

  return (
    <div
      className="add-menu"
      style={{ left: menu.sx, top: menu.sy }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <input
        ref={inputRef}
        placeholder="Search nodes..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
          if (e.key === 'Enter' && flat.length > 0) onPick(flat[0].type);
        }}
      />
      <div className="add-menu-list">
        {groups.map((g) => (
          <div key={g.cat}>
            <div className="cat">{g.cat}</div>
            {g.items.map((d) => (
              <div key={d.type} className="item" onClick={() => onPick(d.type)}>
                {d.label}
              </div>
            ))}
          </div>
        ))}
        {flat.length === 0 && <div className="cat">No matches</div>}
      </div>
    </div>
  );
}

export default function GraphView() {
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const selectedNode = useStore((s) => s.selectedNode);
  const selectedEdge = useStore((s) => s.selectedEdge);
  const { moveNode, removeNode, removeEdge, connect, selectNode, selectEdge, addNode } =
    useStore.getState();

  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ tx: 80, ty: 60, k: 0.8 });
  const [pending, setPending] = useState<Pending | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);

  const viewRef = useRef(view);
  viewRef.current = view;

  const toWorld = (clientX: number, clientY: number) => {
    const rect = containerRef.current!.getBoundingClientRect();
    const v = viewRef.current;
    return {
      x: (clientX - rect.left - v.tx) / v.k,
      y: (clientY - rect.top - v.ty) / v.k,
    };
  };

  // non-passive wheel handler for zoom-to-cursor
  useEffect(() => {
    const el = containerRef.current!;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      setView((v) => {
        const k = Math.min(2.5, Math.max(0.15, v.k * Math.exp(-e.deltaY * 0.0012)));
        return {
          k,
          tx: mx - ((mx - v.tx) * k) / v.k,
          ty: my - ((my - v.ty) * k) / v.k,
        };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // delete key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT') return;
      const s = useStore.getState();
      if (s.selectedNode) removeNode(s.selectedNode);
      else if (s.selectedEdge) removeEdge(s.selectedEdge);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [removeNode, removeEdge]);

  // ------------------------------------------------------------- pointer

  const panState = useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean } | null>(null);

  const onBackgroundPointerDown = (e: React.PointerEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.button !== 0 && e.button !== 1) return;
    setMenu(null);
    panState.current = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onBackgroundPointerMove = (e: React.PointerEvent) => {
    const pan = panState.current;
    if (!pan) return;
    const dx = e.clientX - pan.x;
    const dy = e.clientY - pan.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) pan.moved = true;
    const { tx, ty } = pan;
    setView((v) => ({ ...v, tx: tx + dx, ty: ty + dy }));
  };

  const onBackgroundPointerUp = (e: React.PointerEvent) => {
    if (panState.current && !panState.current.moved) {
      selectNode(null);
    }
    panState.current = null;
  };

  const startNodeDrag = (e: React.PointerEvent, node: NodeInstance) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    selectNode(node.id);
    const start = { mx: e.clientX, my: e.clientY, nx: node.x, ny: node.y };
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    const onMove = (ev: PointerEvent) => {
      const k = viewRef.current.k;
      moveNode(node.id, start.nx + (ev.clientX - start.mx) / k, start.ny + (ev.clientY - start.my) / k);
    };
    const onUp = () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
  };

  const startConnection = (e: React.PointerEvent, fromNode: string) => {
    e.stopPropagation();
    e.preventDefault();
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    const w = toWorld(e.clientX, e.clientY);
    setPending({ from: fromNode, x: w.x, y: w.y });

    const onMove = (ev: PointerEvent) => {
      const p = toWorld(ev.clientX, ev.clientY);
      setPending({ from: fromNode, x: p.x, y: p.y });
    };
    const onUp = (ev: PointerEvent) => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      setPending(null);
      const target = document
        .elementFromPoint(ev.clientX, ev.clientY)
        ?.closest('[data-in-node]') as HTMLElement | null;
      if (target) {
        connect(fromNode, target.dataset.inNode!, Number(target.dataset.inPort));
      }
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
  };

  /** dragging from a connected input detaches the edge and re-drags it */
  const onInputPortDown = (e: React.PointerEvent, node: NodeInstance, port: number) => {
    const edge = edges.find((ed) => ed.to === node.id && ed.toPort === port);
    if (!edge) return;
    e.stopPropagation();
    removeEdge(edge.id);
    startConnection(e, edge.from);
  };

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = containerRef.current!.getBoundingClientRect();
    const w = toWorld(e.clientX, e.clientY);
    setMenu({ sx: e.clientX - rect.left, sy: e.clientY - rect.top, wx: w.x, wy: w.y });
  };

  // ------------------------------------------------------------- render

  const edgeElements = useMemo(
    () =>
      edges
        .filter((e) => nodes[e.from] && nodes[e.to])
        .map((e) => {
          const a = outPortPos(nodes[e.from]);
          const b = inPortPos(nodes[e.to], e.toPort);
          const d = edgePath(a.x, a.y, b.x, b.y);
          const isSel = selectedEdge === e.id;
          return (
            <g key={e.id}>
              <path
                className="edge-hit"
                d={d}
                stroke="transparent"
                strokeWidth={14}
                fill="none"
                onClick={(ev) => {
                  ev.stopPropagation();
                  selectEdge(e.id);
                }}
              />
              <path
                d={d}
                stroke={isSel ? '#4f8cff' : '#454c59'}
                strokeWidth={isSel ? 2.5 : 2}
                fill="none"
              />
            </g>
          );
        }),
    [edges, nodes, selectedEdge, selectEdge]
  );

  return (
    <div
      ref={containerRef}
      className="graph"
      style={{
        backgroundImage: 'radial-gradient(circle, #1d2027 1.2px, transparent 1.2px)',
        backgroundSize: `${26 * view.k}px ${26 * view.k}px`,
        backgroundPosition: `${view.tx}px ${view.ty}px`,
      }}
      onPointerDown={onBackgroundPointerDown}
      onPointerMove={onBackgroundPointerMove}
      onPointerUp={onBackgroundPointerUp}
      onContextMenu={onContextMenu}
    >
      <div
        className="graph-world"
        style={{ transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.k})` }}
      >
        <svg className="graph-edges">
          {edgeElements}
          {pending &&
            nodes[pending.from] &&
            (() => {
              const a = outPortPos(nodes[pending.from]);
              return (
                <path
                  d={edgePath(a.x, a.y, pending.x, pending.y)}
                  stroke="#4f8cff"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  fill="none"
                />
              );
            })()}
        </svg>

        {Object.values(nodes).map((node) => {
          const def = NODE_DEFS[node.type];
          if (!def) return null;
          const isSel = selectedNode === node.id;
          const title =
            node.type === 'output'
              ? CHANNEL_LABELS[node.params.channel as OutputChannel] ?? 'Output'
              : def.label;
          return (
            <div
              key={node.id}
              className={`node${isSel ? ' selected' : ''}${def.isOutput ? ' is-output' : ''}`}
              style={{ left: node.x, top: node.y }}
              onPointerDown={(e) => startNodeDrag(e, node)}
            >
              <div className="node-header">
                <span>{title}</span>
                <span
                  className="close"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    removeNode(node.id);
                  }}
                >
                  ✕
                </span>
              </div>
              <div className="port out" onPointerDown={(e) => startConnection(e, node.id)} />
              <NodeThumb nodeId={node.id} />
              <div className="node-inputs">
                {def.inputs.map((inp, i) => (
                  <div key={inp.key} className="node-input-row">
                    <div
                      className="port in"
                      data-in-node={node.id}
                      data-in-port={i}
                      onPointerDown={(e) => onInputPortDown(e, node, i)}
                    />
                    <span>{inp.label}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {menu && (
        <AddNodeMenu
          menu={menu}
          onClose={() => setMenu(null)}
          onPick={(type) => {
            addNode(type, menu.wx, menu.wy);
            setMenu(null);
          }}
        />
      )}

      <div className="graph-hint">
        Right-click to add a node · drag ports to connect · Delete removes selection
      </div>
    </div>
  );
}
