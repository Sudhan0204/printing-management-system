import { Navigate } from "react-router-dom";

/** Legacy landing route — Customer Reports is now the Reports workspace. */
export default function ReportsHub() {
  return <Navigate to="/reports" replace />;
}
