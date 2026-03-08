import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ProjectDetail from './pages/ProjectDetail';
import AllProjects from './pages/AllProjects';
import Blockers from './pages/Blockers';
import ActivityFeed from './pages/ActivityFeed';
import SocialMedia from './pages/SocialMedia';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<AllProjects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/blockers" element={<Blockers />} />
          <Route path="/activity" element={<ActivityFeed />} />
          <Route path="/social-media" element={<SocialMedia />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
