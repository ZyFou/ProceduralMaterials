import { useStore } from '../store';
import { engine } from '../engine/Engine';

export default function StatusBar() {
  const resolution = useStore((s) => s.resolution);
  const materialName = useStore((s) => s.materialName);
  const isWebGL2 = engine.renderer.capabilities.isWebGL2;

  return (
    <div className="statusbar">
      <span>
        <span className="dot" />
        Ready
      </span>
      <span>{materialName}</span>
      <div className="right">
        <span>{isWebGL2 ? 'WebGL2' : 'WebGL1'}</span>
        <span>
          {resolution} × {resolution}
        </span>
      </div>
    </div>
  );
}
