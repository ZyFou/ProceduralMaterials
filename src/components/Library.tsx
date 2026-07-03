import { useState } from 'react';
import { useStore } from '../store';
import { NODE_CATEGORIES, nodesInCategory } from '../engine/nodeDefs';

export default function Library() {
  const [query, setQuery] = useState('');
  const { addNode } = useStore.getState();
  const q = query.trim().toLowerCase();

  return (
    <div className="panel" style={{ flex: 1 }}>
      <input
        className="library-search"
        placeholder="Search nodes..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="panel-body">
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
