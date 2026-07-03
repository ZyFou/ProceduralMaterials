import { useEffect, useRef } from 'react';
import { engine } from '../engine/Engine';

export default function Viewport() {
  const ref = useRef<HTMLDivElement>(null);

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
      <div className="preview-canvas" ref={ref} />
    </div>
  );
}
