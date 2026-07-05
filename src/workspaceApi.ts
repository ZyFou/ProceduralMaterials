import type { DockviewApi, SerializedDockview } from 'dockview-react';

export const LAYOUT_STORAGE_KEY = 'procedural-materials.dockview-layout.v1';

export let dockviewApi: DockviewApi | null = null;

export function setDockviewApi(api: DockviewApi | null) {
  dockviewApi = api;
}

/** Builds the default panel arrangement into an empty (cleared) dockview instance. */
export function buildDefaultLayout(api: DockviewApi) {
  api.addPanel({ id: 'graph', component: 'graph', title: 'Shader Graph' });
  api.addPanel({
    id: 'viewport',
    component: 'viewport',
    title: 'Viewport',
    position: { referencePanel: 'graph', direction: 'left' },
  });
  api.addPanel({
    id: 'inspector',
    component: 'inspector',
    title: 'Inspector',
    position: { referencePanel: 'graph', direction: 'right' },
  });
  api.addPanel({
    id: 'assets',
    component: 'assets',
    title: 'Assets',
    position: { referencePanel: 'viewport', direction: 'above' },
  });
  api.addPanel({
    id: 'library',
    component: 'library',
    title: 'Library',
    position: { referencePanel: 'assets', direction: 'within' },
  });
  api.addPanel({
    id: 'scene',
    component: 'scene',
    title: 'Scene',
    position: { referencePanel: 'viewport', direction: 'below' },
    initialHeight: 140,
  });
  api.addPanel({
    id: 'outputs',
    component: 'outputs',
    title: 'Outputs',
    position: { referencePanel: 'graph', direction: 'below' },
    initialHeight: 176,
  });
  api.getPanel('assets')?.api.setActive();
  api.getPanel('viewport')?.api.setActive();
}

export function serializeLayout(): SerializedDockview | null {
  return dockviewApi?.toJSON() ?? null;
}

export function saveLayoutToStorage(): boolean {
  const data = serializeLayout();
  if (!data) return false;
  localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(data));
  return true;
}

export function applyLayout(data: SerializedDockview): boolean {
  if (!dockviewApi) return false;
  try {
    dockviewApi.fromJSON(data);
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function resetWorkspace(): void {
  if (!dockviewApi) return;
  dockviewApi.clear();
  buildDefaultLayout(dockviewApi);
  localStorage.removeItem(LAYOUT_STORAGE_KEY);
}
