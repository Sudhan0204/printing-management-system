import { Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { assetUrl, getErrorMessage } from "../services/api";

export default function TenantLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const businessName = user?.tenant?.business_name || "Your business";
  const logoUrl = user?.tenant?.logo_url || assetUrl(user?.tenant?.logo);

  async function handleLogout() {
    setLogoutError("");
    setLoggingOut(true);

    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      setLogoutError(getErrorMessage(error, "Could not log out. Please try again."));
      setLoggingOut(false);
    }
  }

  return (
    <div className="shell tenant-shell">
      <aside className="sidebar tenant-sidebar">
        <div className="brand">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="brand-logo" />
          ) : (
            <span className="brand-mark">TB</span>
          )}
          <div>
            <strong>{businessName}</strong>
            <p>Business portal</p>
          </div>
        </div>

        <nav aria-label="Primary">
          <span className="nav-link is-active">Dashboard</span>
        </nav>

        <section className="profile">
          <p className="profile-label">Signed in as</p>
          <strong>{user?.name}</strong>
          <p>{user?.email}</p>
          <span className="role-badge">{user?.role?.replace("_", " ")}</span>
        </section>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Workspace</p>
            <h1>{businessName}</h1>
          </div>
          <button
            type="button"
            className="primary-button"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? "Logging out..." : "Log out"}
          </button>
        </header>

        {logoutError ? (
          <div className="form-banner workspace-banner" role="alert">
            {logoutError}
          </div>
        ) : null}

        <Outlet />
      </div>
    </div>
  );
}
