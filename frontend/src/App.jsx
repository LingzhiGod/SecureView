import { Navigate, Route, Routes } from 'react-router-dom';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import UserLogin from './pages/UserLogin';
import Viewer from './pages/Viewer';

function RequireRole({ role, children }) {
  const token = localStorage.getItem('sv_token');
  const currentRole = localStorage.getItem('sv_role');

  if (!token || currentRole !== role) {
    return <Navigate to={role === 'admin' ? '/admin-login' : '/user-login'} replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/user-login" replace />} />
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <RequireRole role="admin">
            <AdminDashboard />
          </RequireRole>
        }
      />
      <Route path="/user-login" element={<UserLogin />} />
      <Route
        path="/viewer"
        element={
          <RequireRole role="user">
            <Viewer />
          </RequireRole>
        }
      />
      <Route path="*" element={<Navigate to="/user-login" replace />} />
    </Routes>
  );
}
