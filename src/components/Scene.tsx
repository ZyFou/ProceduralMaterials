import { useStore, type PreviewShape } from '../store';
import Slider from './Slider';

const SHAPES: { value: PreviewShape; label: string }[] = [
  { value: 'sphere', label: 'Sphere' },
  { value: 'cube', label: 'Cube' },
  { value: 'plane', label: 'Plane' },
  { value: 'torusknot', label: 'Torus Knot' },
  { value: 'cylinder', label: 'Cylinder' },
];

export default function Scene() {
  const shape = useStore((s) => s.previewShape);
  const autoRotate = useStore((s) => s.autoRotate);
  const displacement = useStore((s) => s.displacement);
  const tiling = useStore((s) => s.tiling);
  const envIntensity = useStore((s) => s.envIntensity);
  const { setPreviewShape, setAutoRotate, setDisplacement, setTiling, setEnvIntensity } =
    useStore.getState();

  return (
    <div className="panel" style={{ flex: 1 }}>
      <div className="panel-body">
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
          <Slider min={0} max={0.2} step={0.005} value={displacement} onChange={setDisplacement} />
        </div>
        <div className="scene-row">
          <span className="param-label">Tiling</span>
          <Slider min={1} max={6} step={1} value={tiling} onChange={setTiling} />
        </div>
        <div className="scene-row">
          <span className="param-label">Environment</span>
          <Slider min={0} max={3} step={0.05} value={envIntensity} onChange={setEnvIntensity} />
        </div>
      </div>
    </div>
  );
}
