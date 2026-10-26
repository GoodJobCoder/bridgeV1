import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import NeedsBoard from './pages/NeedsBoard.jsx';
import MatchExplorer from './pages/MatchExplorer.jsx';
import OrgDashboard from './pages/OrgDashboard.jsx';
import ImpactDashboard from './pages/ImpactDashboard.jsx';
import Moderation from './pages/Moderation.jsx';
import HowItWorks from './pages/HowItWorks.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/needs" element={<NeedsBoard />} />
        <Route path="/match" element={<MatchExplorer />} />
        <Route path="/organizations" element={<OrgDashboard />} />
        <Route path="/impact" element={<ImpactDashboard />} />
        <Route path="/moderation" element={<Moderation />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}
