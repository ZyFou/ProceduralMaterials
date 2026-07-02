import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { engine } from '../engine/Engine';
import { downloadJSON, downloadBlob, pickFile, slug } from '../utils/files';
import { OUTPUT_CHANNELS, type GraphData, type LayoutData } from '../types';

const RESOLUTIONS = [256, 512, 1024, 2048];
const LAYOUT_STORAGE_KEY = 'procedural-materials.layout.v1';

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

function isLayoutData(value: unknown): value is LayoutData {
  if (!value || typeof value !== 'object') return false;
  const layout = value as Partial<LayoutData>;
  const graphView = layout.graphView as Partial<LayoutData['graphView']> | undefined;
  return (
    layout.version === 1 &&
    !!graphView &&
    typeof graphView.tx === 'number' &&
    typeof graphView.ty === 'number' &&
    typeof graphView.k === 'number'
  );
}

export default function Toolbar() {
  const materialName = useStore((s) => s.materialName);
  const resolution = useStore((s) => s.resolution);
  const { loadGraph, serializeGraph, setResolution, serializeLayout, loadLayout } = useStore.getState();
  const [viewOpen, setViewOpen] = useState(false);
  const viewMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!viewMenuRef.current?.contains(event.target as Node)) setViewOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, []);

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

  const onSaveLayout = () => {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(serializeLayout()));
    setViewOpen(false);
  };

  const onImportLayout = async () => {
    const file = await pickFile('.json,application/json');
    if (!file) return;
    try {
      const layout = JSON.parse(await file.text());
      if (!isLayoutData(layout)) throw new Error('bad layout');
      loadLayout(layout);
      localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout));
      setViewOpen(false);
    } catch {
      alert('Could not read this file as a Procedural Materials layout.');
    }
  };

  const onExportLayout = () => {
    downloadJSON(serializeLayout(), `${slug(materialName)}.layout.json`);
    setViewOpen(false);
  };

  const onRestoreSavedLayout = () => {
    try {
      const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (!saved) return alert('No saved layout found.');
      const layout = JSON.parse(saved);
      if (!isLayoutData(layout)) throw new Error('bad layout');
      loadLayout(layout);
      setViewOpen(false);
    } catch {
      alert('The saved layout could not be restored.');
    }
  };

  const onExportMaps = async () => {
    const name = slug(useStore.getState().materialName);
    let exported = 0;
    for (const channel of OUTPUT_CHANNELS) {
      const blob = await engine.exportChannelPNG(channel);
      if (blob) {
        downloadBlob(blob, `${name}_${channel}.png`);
        exported++;
        // give the browser a beat between downloads
        await new Promise((r) => setTimeout(r, 250));
      }
    }
    if (exported === 0) alert('No output nodes in the graph — add an Output node first.');
  };

  return (
    <div className="toolbar">
      <div className="brand">
        <span className="logo">◆</span>
        <span>
          <strong>Procedural</strong>
          <em>Materials</em>
        </span>
      </div>
      <nav className="top-tabs" aria-label="Main actions">
        <button onClick={() => loadGraph(newGraph())}>New</button>
        <button onClick={onOpen}>Open</button>
        <button onClick={onSave}>Save</button>
        <div className="menu-root" ref={viewMenuRef}>
          <button className={viewOpen ? 'active' : ''} onClick={() => setViewOpen((open) => !open)}>
            View ▾
          </button>
          {viewOpen && (
            <div className="toolbar-menu">
              <button onClick={onSaveLayout}>Save layout</button>
              <button onClick={onRestoreSavedLayout}>Restore saved layout</button>
              <button onClick={onImportLayout}>Import layout…</button>
              <button onClick={onExportLayout}>Export layout…</button>
            </div>
          )}
        </div>
      </nav>
      <div className="spacer" />
      <input
        className="material-name"
        value={materialName}
        onChange={(e) => useStore.setState({ materialName: e.target.value })}
        title="Material name"
      />
      <select value={resolution} onChange={(e) => setResolution(Number(e.target.value))} title="Texture resolution">
        {RESOLUTIONS.map((r) => (
          <option key={r} value={r}>
            {r} × {r}
          </option>
        ))}
      </select>
      <button className="primary" onClick={onExportMaps}>
        Export Maps
      </button>
    </div>
  );
}
