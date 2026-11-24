import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoadingScreen from "./LoadingScreen";

const TENANT_ROLES = ["business_owner", "manager", "accountant", "employee"];

export default function ProtectedRoute({
  children,
  roles = ["super_admin"],
  loginPath = "/admin/login",
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen message="Checking your session..." />;
  }

  if (!user || !roles.includes(user.role)) {
    return <Navigate to={loginPath} replace />;
  }

  return children;
}

export function AdminProtectedRoute({ children }) {
  return (
    <ProtectedRoute roles={["super_admin"]} loginPath="/admin/login">
      {children}
    </ProtectedRoute>
  );
}

export function TenantProtectedRoute({ children }) {
  return (
    <ProtectedRoute roles={TENANT_ROLES} loginPath="/login">
      {children}
    </ProtectedRoute>
  );
}
