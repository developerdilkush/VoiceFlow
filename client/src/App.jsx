import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import SingleCallPage from './pages/SingleCallPage.jsx';
import BulkCallingPage from './pages/BulkCallingPage.jsx';
import CallHistoryPage from './pages/CallHistoryPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="call" element={<SingleCallPage />} />
        <Route path="bulk" element={<BulkCallingPage />} />
        <Route path="history" element={<CallHistoryPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage tab="preferences" />} />
        <Route path="profile" element={<SettingsPage tab="profile" />} />
        <Route path="security" element={<SettingsPage tab="security" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
