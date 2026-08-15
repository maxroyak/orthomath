import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { DiagnosticsPage } from './pages/DiagnosticsPage';
import { SpaceAnalysisPage } from './pages/SpaceAnalysisPage';
import { ScenariosPage } from './pages/ScenariosPage';
import { ComparisonPage } from './pages/ComparisonPage';
import { SummaryPage } from './pages/SummaryPage';
import { SettingsPage } from './pages/SettingsPage';
import { AboutPage } from './pages/AboutPage';

function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/patient/:patientId/diagnostics" element={<DiagnosticsPage />} />
          <Route path="/patient/:patientId/space-analysis" element={<SpaceAnalysisPage />} />
          <Route path="/patient/:patientId/scenarios" element={<ScenariosPage />} />
          <Route path="/patient/:patientId/comparison" element={<ComparisonPage />} />
          <Route path="/patient/:patientId/summary" element={<SummaryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}

export default App;