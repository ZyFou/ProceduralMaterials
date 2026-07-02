import { useState } from 'react';
import { useStore } from '../store';
import { PRESETS } from '../presets';
import { NODE_CATEGORIES, nodesInCategory } from '../engine/nodeDefs';

export default function Library() {
  const [query, setQuery] = useState('');
  const { loadGraph, addNode } = useStore.getState();
  const q = query.trim().toLowerCase();

  const presets = PRESETS.filter(
    (p) => !q || p.name.toLowerCase().includes(q) || p.tags.some((t) => t.includes(q))
  );

  return (
    <div className="panel" style={{ flex: 1 }}>
      <div className="panel-header">Library</div>
      <input
        className="library-search"
        placeholder="Search materials & nodes..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="panel-body">
        <div className="library-section">Materials</div>
        {presets.map((p) => (
          <div key={p.name} className="library-item" onClick={() => loadGraph(p.build())} title="Load material">
            <span>◈</span> {p.name}
            <span className="tag">{p.tags[0]}</span>
          </div>
        ))}
        {presets.length === 0 && <div className="library-item">No matches</div>}

        {NODE_CATEGORIES.map((cat) => {
          const items = nodesInCategory(cat).filter(
            (d) => !q || d.label.toLowerCase().includes(q)
          );
          if (items.length === 0) return null;
          return (
            <div key={cat}>
              <div className="library-section">{cat} Nodes</div>
              {items.map((d) => (
                <div
                  key={d.type}
                  className="library-item"
                  title="Add to graph"
                  onClick={() => addNode(d.type, 40 + Math.random() * 120, 40 + Math.random() * 120)}
                >
                  <span>▫</span> {d.label}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
