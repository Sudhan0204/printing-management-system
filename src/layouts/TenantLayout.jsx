import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { assetUrl, getErrorMessage } from "../services/api";

const NAV_ITEMS = [
  { label: "Dashboard", to: "/dashboard", end: true },
  { label: "Customers", to: "/customers" },
  { label: "Products & Rates", to: "/products" },
  { label: "Billing", to: "/billing" },
  { label: "Payments", to: "/payments" },
  { label: "Expenses", to: "/expenses", disabled: true },
  { label: "Reports", to: "/reports", disabled: true },
  { label: "Settings", to: "/settings", disabled: true },
];

export default function TenantLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

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
    <div className={`shell tenant-shell ${menuOpen ? "menu-open" : ""}`}>
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

        <nav aria-label="Primary" onClick={() => setMenuOpen(false)}>
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
          <span className="role-badge">{user?.role?.replaceAll("_", " ")}</span>
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
              <p className="eyebrow">Workspace</p>
              <h1>{businessName}</h1>
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
