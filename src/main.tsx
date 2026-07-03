import { createRoot } from 'react-dom/client';
import App from './App';
import { useStore } from './store';
import { PRESETS } from './presets';
import 'dockview-react/dist/styles/dockview.css';
import './dockview-theme.css';
import './styles.css';

// load a default material so the first launch shows something interesting
useStore.getState().loadGraph(PRESETS[0].build());

createRoot(document.getElementById('root')!).render(<App />);
