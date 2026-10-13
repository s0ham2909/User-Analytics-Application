import { Routes, Route, NavLink } from 'react-router-dom';
import SessionsPage from './pages/SessionsPage.jsx';
import SessionDetail from './pages/SessionDetail.jsx';
import HeatmapPage from './pages/HeatmapPage.jsx';

export default function App() {
  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">Acme Analytics</span>
        <nav>
          <NavLink to="/" end>Sessions</NavLink>
          <NavLink to="/heatmap">Heatmap</NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<SessionsPage />} />
          <Route path="/sessions/:id" element={<SessionDetail />} />
          <Route path="/heatmap" element={<HeatmapPage />} />
        </Routes>
      </main>
    </div>
  );
}
