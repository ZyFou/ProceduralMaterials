import { useEffect, useRef } from 'react';
import { DockviewReact, type DockviewReadyEvent, type SerializedDockview } from 'dockview-react';
import { PANEL_COMPONENTS } from './dockPanels';
import { buildDefaultLayout, setDockviewApi } from '../workspaceApi';

export const LAYOUT_STORAGE_KEY = 'procedural-materials.dockview-layout.v1';

export default function Workspace() {
  const saveTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => window.clearTimeout(saveTimer.current);
  }, []);

  const onReady = (event: DockviewReadyEvent) => {
    setDockviewApi(event.api);

    let restored = false;
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (raw) {
      try {
        const data = JSON.parse(raw) as SerializedDockview;
        event.api.fromJSON(data);
        restored = true;
      } catch {
        // corrupt JSON, or a saved panel id no longer has a matching
        // component (e.g. after a panel rename/removal) — rebuild default.
      }
    }
    if (!restored) buildDefaultLayout(event.api);

    event.api.onDidLayoutChange(() => {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(event.api.toJSON()));
      }, 300);
    });
  };

  return (
    <div className="workspace-root">
      <DockviewReact
        className="dockview-theme-procedural"
        components={PANEL_COMPONENTS}
        onReady={onReady}
      />
    </div>
  );
}
