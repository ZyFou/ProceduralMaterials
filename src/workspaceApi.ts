import type { DockviewApi } from 'dockview-react';

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
