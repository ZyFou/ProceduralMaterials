import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { engine } from '../engine/Engine';
import { downloadJSON, downloadBlob, pickFile, slug } from '../utils/files';
import { OUTPUT_CHANNELS, type GraphData } from '../types';
import type { SerializedDockview } from 'dockview-react';
import {
  dockviewApi,
  applyLayout,
  resetWorkspace,
  saveLayoutToStorage,
  serializeLayout,
} from '../workspaceApi';

const RESOLUTIONS = [128, 256, 512, 1024, 2048, 4096];

const HIDEABLE_PANELS = [{ id: 'performance', title: 'Performance' }];

function newGraph(): GraphData {
  return {
    name: 'Untitled',
    nodes: [
      { id: 'noise_1', type: 'noise', x: 0, y: 40, params: {} },
      { id: 'out_1', type: 'output', x: 280, y: 40, params: { channel: 'basecolor' } },
    ],
    edges: [{ id: 'e_1', from: 'noise_1', to: 'out_1', toPort: 0 }],
  };
}

function ViewMenu() {
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const hidden = HIDEABLE_PANELS.filter((p) => !dockviewApi?.getPanel(p.id));

  const flashMsg = (msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash(''), 1800);
  };

  const onSaveLayout = () => {
    if (saveLayoutToStorage()) flashMsg('Layout saved');
    else flashMsg('Workspace not ready');
    setOpen(false);
  };

  const onExportLayout = () => {
    const data = serializeLayout();
    if (!data) {
      flashMsg('Workspace not ready');
      return;
    }
    downloadJSON(data, 'workspace.layout.json');
    setOpen(false);
  };

  const onImportLayout = async () => {
    const file = await pickFile('.json,application/json');
    if (!file) return;
    try {
      const data = JSON.parse(await file.text()) as SerializedDockview;
      if (!applyLayout(data)) throw new Error('apply failed');
      flashMsg('Layout imported');
    } catch {
      alert('Could not read this file as a workspace layout.');
    }
    setOpen(false);
  };

  const onReset = () => {
    resetWorkspace();
    flashMsg('Layout reset');
    setOpen(false);
  };

  return (
    <div className="view-menu-anchor" ref={ref}>
      <button
        className={`toolbar-btn menu-trigger${open ? ' open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        View
        <span className="chevron" aria-hidden />
      </button>
      {flash && <span className="toolbar-flash">{flash}</span>}
      {open && (
        <div className="view-menu">
          <div className="view-menu-label">Panels</div>
          {hidden.length === 0 && <div className="view-menu-item disabled">All panels open</div>}
          {hidden.map((p) => (
            <div
              key={p.id}
              className="view-menu-item"
              onClick={() => {
                dockviewApi?.addPanel({
                  id: p.id,
                  component: p.id,
                  title: p.title,
                  position: { referencePanel: 'inspector', direction: 'below' },
                });
                setOpen(false);
              }}
            >
              {p.title}
            </div>
          ))}
          <div className="view-menu-separator" />
          <div className="view-menu-label">Layout</div>
          <div className="view-menu-item" onClick={onSaveLayout}>
            Save layout
          </div>
          <div className="view-menu-item" onClick={onExportLayout}>
            Export layout…
          </div>
          <div className="view-menu-item" onClick={onImportLayout}>
            Import layout…
          </div>
          <div className="view-menu-separator" />
          <div className="view-menu-item danger" onClick={onReset}>
            Reset workspace
          </div>
        </div>
      )}
    </div>
  );
}

export default function Toolbar() {
  const materialName = useStore((s) => s.materialName);
  const resolution = useStore((s) => s.resolution);
  const { loadGraph, serializeGraph, setResolution } = useStore.getState();

  const onOpen = async () => {
    const file = await pickFile('.json,application/json');
    if (!file) return;
    try {
      const graph = JSON.parse(await file.text()) as GraphData;
      if (!Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) throw new Error('bad file');
      loadGraph(graph);
    } catch {
      alert('Could not read this file as a material graph.');
    }
  };

  const onSave = () => {
    const graph = serializeGraph();
    downloadJSON(graph, `${slug(graph.name)}.material.json`);
  };

  const onExportMaps = async () => {
    const name = slug(useStore.getState().materialName);
    let exported = 0;
    for (const channel of OUTPUT_CHANNELS) {
      const blob = await engine.exportChannelPNG(channel);
      if (blob) {
        downloadBlob(blob, `${name}_${channel}.png`);
        exported++;
        await new Promise((r) => setTimeout(r, 250));
      }
    }
    if (exported === 0) alert('No output nodes in the graph — add an Output node first.');
  };

  return (
    <header className="toolbar">
      <div className="toolbar-brand">
        <span className="toolbar-logo" aria-hidden>
          ◆
        </span>
        <div className="toolbar-brand-text">
          <span className="toolbar-title">Procedural Materials</span>
          <span className="toolbar-subtitle">Shader editor</span>
        </div>
      </div>

      <div className="toolbar-divider" aria-hidden />

      <div className="toolbar-group">
        <button className="toolbar-btn" onClick={() => loadGraph(newGraph())}>
          New
        </button>
        <button className="toolbar-btn" onClick={onOpen}>
          Open
        </button>
        <button className="toolbar-btn" onClick={onSave}>
          Save
        </button>
      </div>

      <div className="toolbar-divider" aria-hidden />

      <ViewMenu />

      <div className="toolbar-spacer" />

      <div className="toolbar-group toolbar-group-end">
        <input
          className="material-name"
          value={materialName}
          onChange={(e) => useStore.setState({ materialName: e.target.value })}
          title="Material name"
          placeholder="Material name"
        />
        <select
          value={resolution}
          onChange={(e) => setResolution(Number(e.target.value))}
          title="Texture resolution"
        >
          {RESOLUTIONS.map((r) => (
            <option key={r} value={r}>
              {r} × {r}
            </option>
          ))}
        </select>
        <button className="toolbar-btn primary" onClick={onExportMaps}>
          Export Maps
        </button>
      </div>
    </header>
  );
}
