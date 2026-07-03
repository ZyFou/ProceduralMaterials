import type { ComponentType, FunctionComponent } from 'react';
import type { IDockviewPanelProps } from 'dockview-react';
import Assets from './Assets';
import Library from './Library';
import Viewport from './Viewport';
import Scene from './Scene';
import GraphView from './GraphView';
import Inspector from './Inspector';
import Outputs from './Outputs';
import PerformancePanel from './PerformancePanel';

// dockview sizes each panel's content host with an explicit height; a
// height:100% flex wrapper is all that's needed for the existing
// .panel/.graph/.outputs components (they already fill a flex parent).
function panelHost(Comp: ComponentType): FunctionComponent<IDockviewPanelProps> {
  return function DockviewPanel(_props: IDockviewPanelProps) {
    return (
      <div style={{ height: '100%', display: 'flex', minHeight: 0 }}>
        <Comp />
      </div>
    );
  };
}

export const PANEL_COMPONENTS: Record<string, FunctionComponent<IDockviewPanelProps>> = {
  assets: panelHost(Assets),
  library: panelHost(Library),
  viewport: panelHost(Viewport),
  scene: panelHost(Scene),
  graph: panelHost(GraphView),
  inspector: panelHost(Inspector),
  outputs: panelHost(Outputs),
  performance: panelHost(PerformancePanel),
};
