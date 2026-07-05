import { useEffect, useRef, useState } from 'react';
import { engine } from '../engine/Engine';
import { OUTPUT_CHANNELS, CHANNEL_LABELS, type OutputChannel } from '../types';
import { useStore } from '../store';

const LAYOUT_KEY = 'procedural-materials.outputs-layout';

type OutputLayout = 'horizontal' | 'vertical';

function OutputCell({ channel, active }: { channel: OutputChannel; active: boolean }) {  const ref = useRef<HTMLCanvasElement>(null);
  const resolution = useStore((s) => s.resolution);

  useEffect(() => {
    engine.registerOutputCanvas(channel, ref.current);
    return () => engine.registerOutputCanvas(channel, null);
  }, [channel]);

  return (
    <div className={`output-cell ${active ? 'active' : 'inactive'}`}>
      <canvas ref={ref} width={128} height={128} />
      <span className="label">
        {CHANNEL_LABELS[channel]}
        {active ? ` · ${resolution}` : ''}
      </span>
    </div>
  );
}

export default function Outputs() {
  const [activeChannels, setActiveChannels] = useState<Set<string>>(new Set());
  const [layout, setLayout] = useState<OutputLayout>(() => {
    const saved = localStorage.getItem(LAYOUT_KEY);
    return saved === 'vertical' ? 'vertical' : 'horizontal';
  });

  useEffect(() => {
    localStorage.setItem(LAYOUT_KEY, layout);
  }, [layout]);

  useEffect(() => {
    engine.onOutputsChanged = () => {
      setActiveChannels(new Set(engine.getChannelSources().keys()));
    };
    return () => {
      engine.onOutputsChanged = null;
    };
  }, []);

  return (
    <div className="outputs">
      <div className="outputs-toolbar">
        <span className="outputs-toolbar-label">Maps</span>
        <div className="outputs-layout-toggle" role="group" aria-label="Layout">
          <button
            type="button"
            className={layout === 'horizontal' ? 'active' : ''}
            onClick={() => setLayout('horizontal')}
            title="Horizontal layout"
            aria-pressed={layout === 'horizontal'}
          >
            ↔
          </button>
          <button
            type="button"
            className={layout === 'vertical' ? 'active' : ''}
            onClick={() => setLayout('vertical')}
            title="Vertical layout"
            aria-pressed={layout === 'vertical'}
          >
            ↕
          </button>
        </div>
      </div>
      <div className={`outputs-strip ${layout}`}>
        {OUTPUT_CHANNELS.map((c) => (
          <OutputCell key={c} channel={c} active={activeChannels.has(c)} />
        ))}
      </div>
    </div>
  );
}