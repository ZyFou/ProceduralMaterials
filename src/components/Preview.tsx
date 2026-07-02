import { useEffect, useRef } from 'react';
import { engine } from '../engine/Engine';
import { useStore, type PreviewShape } from '../store';

const SHAPES: { value: PreviewShape; label: string }[] = [
  { value: 'sphere', label: 'Sphere' },
  { value: 'cube', label: 'Cube' },
  { value: 'plane', label: 'Plane' },
  { value: 'torusknot', label: 'Torus Knot' },
  { value: 'cylinder', label: 'Cylinder' },
];

export default function Preview() {
  const ref = useRef<HTMLDivElement>(null);
  const shape = useStore((s) => s.previewShape);
  const autoRotate = useStore((s) => s.autoRotate);
  const displacement = useStore((s) => s.displacement);
  const tiling = useStore((s) => s.tiling);
  const envIntensity = useStore((s) => s.envIntensity);
  const { setPreviewShape, setAutoRotate, setDisplacement, setTiling, setEnvIntensity } =
    useStore.getState();

  useEffect(() => {
    const el = ref.current!;
    engine.mount(el);
    const ro = new ResizeObserver(() => engine.resize());
    ro.observe(el);
    return () => {
      ro.disconnect();
      engine.unmount();
    };
  }, []);

  return (
    <div className="panel preview">
      <div className="panel-header">Preview</div>
      <div className="preview-canvas" ref={ref} />
      <div className="preview-controls">
        <select value={shape} onChange={(e) => setPreviewShape(e.target.value as PreviewShape)}>
          {SHAPES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <label>
          <input
            type="checkbox"
            checked={autoRotate}
            onChange={(e) => setAutoRotate(e.target.checked)}
          />
          Rotate
        </label>
      </div>
      <div className="scene-row">
        <span className="param-label">Displacement</span>
        <input
          type="range"
          min={0}
          max={0.2}
          step={0.005}
          value={displacement}
          onChange={(e) => setDisplacement(Number(e.target.value))}
        />
      </div>
      <div className="scene-row">
        <span className="param-label">Tiling</span>
        <input
          type="range"
          min={1}
          max={6}
          step={1}
          value={tiling}
          onChange={(e) => setTiling(Number(e.target.value))}
        />
      </div>
      <div className="scene-row">
        <span className="param-label">Environment</span>
        <input
          type="range"
          min={0}
          max={3}
          step={0.05}
          value={envIntensity}
          onChange={(e) => setEnvIntensity(Number(e.target.value))}
        />
      </div>
    </div>
  );
}
