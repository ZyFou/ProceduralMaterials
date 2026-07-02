import { useStore } from '../store';
import { engine } from '../engine/Engine';
import { downloadJSON, downloadBlob, pickFile, slug } from '../utils/files';
import { OUTPUT_CHANNELS, type GraphData } from '../types';

const RESOLUTIONS = [256, 512, 1024, 2048];

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
        // give the browser a beat between downloads
        await new Promise((r) => setTimeout(r, 250));
      }
    }
    if (exported === 0) alert('No output nodes in the graph — add an Output node first.');
  };

  return (
    <div className="toolbar">
      <div className="brand">
        <span className="logo">◆</span> Procedural Materials
      </div>
      <button onClick={() => loadGraph(newGraph())}>New</button>
      <button onClick={onOpen}>Open</button>
      <button onClick={onSave}>Save</button>
      <div className="spacer" />
      <input
        className="material-name"
        value={materialName}
        onChange={(e) => useStore.setState({ materialName: e.target.value })}
        title="Material name"
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
      <button className="primary" onClick={onExportMaps}>
        Export Maps
      </button>
    </div>
  );
}
