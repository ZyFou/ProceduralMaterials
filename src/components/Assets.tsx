import { useState } from 'react';
import { useStore } from '../store';
import { PRESETS } from '../presets';

export default function Assets() {
  const [query, setQuery] = useState('');
  const { loadGraph } = useStore.getState();
  const q = query.trim().toLowerCase();

  const presets = PRESETS.filter(
    (p) => !q || p.name.toLowerCase().includes(q) || p.tags.some((t) => t.includes(q))
  );

  return (
    <div className="panel" style={{ flex: 1 }}>
      <input
        className="library-search"
        placeholder="Search materials..."
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
      </div>
    </div>
  );
}
