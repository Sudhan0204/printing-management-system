import { Navigate, Route, Routes } from "react-router-dom";
import GuestRoute from "../components/GuestRoute";
import LoadingScreen from "../components/LoadingScreen";
import {
  AdminProtectedRoute,
  TenantProtectedRoute,
} from "../components/ProtectedRoute";
import { useAuth } from "../context/AuthContext";
import DashboardLayout from "../layouts/DashboardLayout";
import TenantLayout from "../layouts/TenantLayout";
import AdminLogin from "../pages/auth/AdminLogin";
import TenantLogin from "../pages/auth/TenantLogin";
import BillCreate from "../pages/billing/BillCreate";
import BillDetail from "../pages/billing/BillDetail";
import BillsList from "../pages/billing/BillsList";
import ClientCreate from "../pages/clients/ClientCreate";
import ClientDetail from "../pages/clients/ClientDetail";
import ClientEdit from "../pages/clients/ClientEdit";
import ClientsList from "../pages/clients/ClientsList";
import CustomerDetail from "../pages/customers/CustomerDetail";
import CustomerFormPage from "../pages/customers/CustomerFormPage";
import CustomersList from "../pages/customers/CustomersList";
import Dashboard from "../pages/dashboard/Dashboard";
import TenantDashboard from "../pages/dashboard/TenantDashboard";
import ProductFormPage from "../pages/products/ProductFormPage";
import ProductRates from "../pages/products/ProductRates";
import ProductsList from "../pages/products/ProductsList";
import PaymentDetail from "../pages/payments/PaymentDetail";
import PaymentsDashboard from "../pages/payments/PaymentsDashboard";
import ReceivePayment from "../pages/payments/ReceivePayment";
import CustomerReports from "../pages/reports/CustomerReports";
import ReportsHub from "../pages/reports/ReportsHub";

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
        element={
          <TenantProtectedRoute>
            <TenantLayout />
          </TenantProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<TenantDashboard />} />
        <Route path="/customers" element={<CustomersList />} />
        <Route path="/customers/create" element={<CustomerFormPage mode="create" />} />
        <Route path="/customers/:id" element={<CustomerDetail />} />
        <Route path="/customers/:id/edit" element={<CustomerFormPage mode="edit" />} />
        <Route path="/products" element={<ProductsList />} />
        <Route path="/products/create" element={<ProductFormPage mode="create" />} />
        <Route path="/products/:id/edit" element={<ProductFormPage mode="edit" />} />
        <Route path="/products/:id/rates" element={<ProductRates />} />
        <Route path="/billing" element={<BillsList />} />
        <Route path="/billing/create" element={<BillCreate />} />
        <Route path="/billing/:id" element={<BillDetail />} />
        <Route path="/payments" element={<PaymentsDashboard />} />
        <Route path="/payments/receive" element={<ReceivePayment />} />
        <Route path="/payments/:id" element={<PaymentDetail />} />
        <Route path="/reports" element={<ReportsHub />} />
        <Route path="/reports/customers" element={<CustomerReports />} />
      </Route>

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}
