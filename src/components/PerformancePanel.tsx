import { useEffect, useState } from 'react';
import { engine, type EngineStats } from '../engine/Engine';

export default function PerformancePanel() {
  const [stats, setStats] = useState<EngineStats | null>(null);

  useEffect(() => engine.addStatsListener(setStats), []);

  return (
    <div className="panel perf" style={{ flex: 1 }}>
      <div className="perf-grid">
        <span className="k">FPS</span>
        <span className={`v ${stats && stats.fps >= 50 ? 'good' : ''}`}>{stats?.fps ?? '—'}</span>
        <span className="k">Frame Time</span>
        <span className="v">{stats ? `${stats.frameMs.toFixed(1)} ms` : '—'}</span>
        <span className="k">Draw Calls</span>
        <span className="v">{stats?.drawCalls ?? '—'}</span>
        <span className="k">Triangles</span>
        <span className="v">{stats ? stats.triangles.toLocaleString() : '—'}</span>
        <span className="k">Textures</span>
        <span className="v">{stats?.textures ?? '—'}</span>
        <span className="k">Nodes</span>
        <span className="v">{stats?.nodeCount ?? '—'}</span>
        <span className="k">Est. VRAM</span>
        <span className="v">{stats ? `${stats.vramMB.toFixed(0)} MB` : '—'}</span>
      </div>
    </div>
  );
}
