import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoadingScreen from "./LoadingScreen";

export default function GuestRoute({
  children,
  forRole = "super_admin",
  redirectTo = "/admin/dashboard",
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen message="Checking your session..." />;
  }

  if (forRole === "super_admin" && user?.role === "super_admin") {
    return <Navigate to={redirectTo} replace />;
  }

  if (
    forRole === "tenant" &&
    user &&
    user.role !== "super_admin" &&
    user.tenant_id
  ) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}
