import Toolbar from './components/Toolbar';
import Workspace from './components/Workspace';
import StatusBar from './components/StatusBar';

export default function App() {
  return (
    <div className="app">
      <Toolbar />
      <Workspace />
      <StatusBar />
    </div>
  );
}
