import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../services/api";

const NAV_ITEMS = [
  { label: "Dashboard", to: "/", end: true },
  { label: "Businesses", disabled: true },
  { label: "Users", disabled: true },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

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
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">PM</span>
          <div>
            <strong>PrintDesk</strong>
            <p>Super Admin</p>
          </div>
        </div>

        <nav aria-label="Primary">
          {NAV_ITEMS.map((item) =>
            item.disabled ? (
              <span key={item.label} className="nav-link is-disabled" title="Coming soon">
                {item.label}
              </span>
            ) : (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  isActive ? "nav-link is-active" : "nav-link"
                }
              >
                {item.label}
              </NavLink>
            )
          )}
        </nav>

        <section className="profile">
          <p className="profile-label">Signed in as</p>
          <strong>{user?.name}</strong>
          <p>{user?.email}</p>
          <span className="role-badge">Super Admin</span>
        </section>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Platform</p>
            <h1>Super Admin</h1>
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
