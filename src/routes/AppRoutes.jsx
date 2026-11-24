import { Navigate, Route, Routes } from "react-router-dom";
import GuestRoute from "../components/GuestRoute";
import {
  AdminProtectedRoute,
  TenantProtectedRoute,
} from "../components/ProtectedRoute";
import DashboardLayout from "../layouts/DashboardLayout";
import TenantLayout from "../layouts/TenantLayout";
import AdminLogin from "../pages/auth/AdminLogin";
import TenantLogin from "../pages/auth/TenantLogin";
import ClientCreate from "../pages/clients/ClientCreate";
import ClientDetail from "../pages/clients/ClientDetail";
import ClientEdit from "../pages/clients/ClientEdit";
import ClientsList from "../pages/clients/ClientsList";
import Dashboard from "../pages/dashboard/Dashboard";
import TenantDashboard from "../pages/dashboard/TenantDashboard";
import { useAuth } from "../context/AuthContext";
import LoadingScreen from "../components/LoadingScreen";

function HomeRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen message="Checking your session..." />;
  }

  if (user?.role === "super_admin") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (user && user.role !== "super_admin" && user.tenant_id) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />

      <Route
        path="/admin/login"
        element={
          <GuestRoute forRole="super_admin" redirectTo="/admin/dashboard">
            <AdminLogin />
          </GuestRoute>
        }
      />

      <Route
        path="/login"
        element={
          <GuestRoute forRole="tenant" redirectTo="/dashboard">
            <TenantLogin />
          </GuestRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <AdminProtectedRoute>
            <DashboardLayout />
          </AdminProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="clients" element={<ClientsList />} />
        <Route path="clients/create" element={<ClientCreate />} />
        <Route path="clients/:id" element={<ClientDetail />} />
        <Route path="clients/:id/edit" element={<ClientEdit />} />
      </Route>

      <Route
        path="/dashboard"
        element={
          <TenantProtectedRoute>
            <TenantLayout />
          </TenantProtectedRoute>
        }
      >
        <Route index element={<TenantDashboard />} />
      </Route>

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}
