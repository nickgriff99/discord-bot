import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';
import { HowToRunPage } from './pages/HowToRunPage';
import { CommandsPage } from './pages/CommandsPage';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/how-to-run" element={<HowToRunPage />} />
        <Route path="/commands" element={<CommandsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
