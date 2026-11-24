import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../services/api";

const NAV_ITEMS = [
  { label: "Dashboard", to: "/admin/dashboard", end: true },
  { label: "Clients", to: "/admin/clients" },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    setLogoutError("");
    setLoggingOut(true);

    try {
      await logout();
      navigate("/admin/login", { replace: true });
    } catch (error) {
      setLogoutError(getErrorMessage(error, "Could not log out. Please try again."));
      setLoggingOut(false);
    }
  }

  return (
    <div className={`shell ${menuOpen ? "menu-open" : ""}`}>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">PM</span>
          <div>
            <strong>PrintDesk</strong>
            <p>Super Admin</p>
          </div>
        </div>

        <nav aria-label="Primary" onClick={() => setMenuOpen(false)}>
          {NAV_ITEMS.map((item) => (
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
          ))}
        </nav>

        <section className="profile">
          <p className="profile-label">Signed in as</p>
          <strong>{user?.name}</strong>
          <p>{user?.email}</p>
          <span className="role-badge">Super Admin</span>
        </section>
      </aside>

      {menuOpen ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <div className="workspace">
        <header className="topbar">
          <div className="topbar-start">
            <button
              type="button"
              className="ghost-button menu-toggle"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
            >
              Menu
            </button>
            <div>
              <p className="eyebrow">Platform</p>
              <h1>Super Admin</h1>
            </div>
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
