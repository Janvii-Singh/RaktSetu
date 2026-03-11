import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import DashboardLayout from './components/DashboardLayout';
import DonorDashboard from './pages/DonorDashboard';
import PatientDashboard from './pages/PatientDashboard';
import HospitalDashboard from './pages/HospitalDashboard';
import Profile from './pages/Profile';
import RequestDetail from './pages/RequestDetail';
import CreateRequest from './pages/CreateRequest';
import DonationHistory from './pages/DonationHistory';
import MapView from './pages/MapView';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  return user ? children : <Navigate to="/login" />;
}

function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  const dashboardMap = {
    donor: '/dashboard/donor',
    patient: '/dashboard/patient',
    hospital: '/dashboard/hospital',
  };
  return <Navigate to={dashboardMap[user.role] || '/login'} />;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-lg">Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/" element={user ? <RoleRedirect /> : <Landing />} />
      <Route path="/login" element={user ? <RoleRedirect /> : <Login />} />
      <Route path="/register" element={user ? <RoleRedirect /> : <Register />} />

      <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<RoleRedirect />} />
        <Route path="donor" element={<DonorDashboard />} />
        <Route path="patient" element={<PatientDashboard />} />
        <Route path="hospital" element={<HospitalDashboard />} />
        <Route path="profile" element={<Profile />} />
        <Route path="requests/new" element={<CreateRequest />} />
        <Route path="requests/:id" element={<RequestDetail />} />
        <Route path="history" element={<DonationHistory />} />
        <Route path="map" element={<MapView />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
