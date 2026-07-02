import Toolbar from './components/Toolbar';
import Library from './components/Library';
import GraphView from './components/GraphView';
import Inspector from './components/Inspector';
import Preview from './components/Preview';
import Outputs from './components/Outputs';
import PerformancePanel from './components/PerformancePanel';
import StatusBar from './components/StatusBar';

export default function App() {
  return (
    <div className="app">
      <Toolbar />
      <div className="app-main">
        <div className="app-left">
          <Preview />
          <Library />
        </div>
        <GraphView />
        <div className="app-right">
          <Inspector />
          <PerformancePanel />
        </div>
      </div>
      <Outputs />
      <StatusBar />
    </div>
  );
}
