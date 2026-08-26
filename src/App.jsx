import { Navigate, Route, Routes } from 'react-router-dom';
import { useApp } from './context/AppContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Users from './pages/Users.jsx';
import DataForm from './pages/DataForm.jsx';
import Template from './pages/Template.jsx';
import ComputerIds from './pages/ComputerIds.jsx';
import Upload from './pages/Upload.jsx';
import ViewData from './pages/ViewData.jsx';
import Reports from './pages/Reports.jsx';

function Protected({ children }) {
  const { currentUser } = useApp();
  if (!currentUser) return <Navigate to="/login" replace />;
  return children;
}

function AdminOnly({ children }) {
  const { currentUser } = useApp();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (currentUser.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  const { currentUser, authReady } = useApp();

  // Wait for the session-restore check before deciding to redirect (prevents a
  // refresh from bouncing an authenticated user to the login page).
  if (!authReady) {
    return <div className="empty" style={{ padding: 40, textAlign: 'center' }}>Loading…</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={currentUser ? <Navigate to="/dashboard" replace /> : <Login />} />

      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dataform" element={<DataForm />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/viewdata" element={<ViewData />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/users" element={<AdminOnly><Users /></AdminOnly>} />
        <Route path="/template" element={<AdminOnly><Template /></AdminOnly>} />
        <Route path="/cids" element={<AdminOnly><ComputerIds /></AdminOnly>} />
      </Route>

      <Route path="/" element={<Navigate to={currentUser ? '/dashboard' : '/login'} replace />} />
      <Route path="*" element={<Navigate to={currentUser ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}