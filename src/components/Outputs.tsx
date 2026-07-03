import { useEffect, useRef, useState } from 'react';
import { engine } from '../engine/Engine';
import { OUTPUT_CHANNELS, CHANNEL_LABELS, type OutputChannel } from '../types';
import { useStore } from '../store';

function OutputCell({ channel, active }: { channel: OutputChannel; active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
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

  useEffect(() => {
    engine.onOutputsChanged = () => {
      setActiveChannels(new Set(engine.getChannelSources().keys()));
    };
    return () => {
      engine.onOutputsChanged = null;
    };
  }, []);

  return (
    <div className="outputs" style={{ flex: 1 }}>
      <div className="outputs-strip">
        {OUTPUT_CHANNELS.map((c) => (
          <OutputCell key={c} channel={c} active={activeChannels.has(c)} />
        ))}
      </div>
    </div>
  );
}
