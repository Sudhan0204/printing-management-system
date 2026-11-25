import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { assetUrl, getErrorMessage } from "../../services/api";
import { fetchTenantDashboard } from "../../services/auth";

export default function TenantDashboard() {
  const { user, clearSession } = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetchTenantDashboard();
        if (active) {
          setDashboard(response.data.dashboard);
          setError("");
        }
      } catch (requestError) {
        if (!active) return;
        if (requestError?.response?.status === 401 || requestError?.response?.status === 403) {
          clearSession();
          navigate("/login", { replace: true });
          return;
        }
        setError(getErrorMessage(requestError, "Could not load dashboard."));
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [clearSession, navigate]);

  const logoUrl = dashboard?.logo_url || assetUrl(dashboard?.logo) || user?.tenant?.logo_url;
  const businessName = dashboard?.business_name || user?.tenant?.business_name || "Your business";

  return (
    <main className="dashboard">
      <section className="welcome panel tenant-welcome">
        <div className="tenant-hero">
          {logoUrl ? (
            <img src={logoUrl} alt={`${businessName} logo`} className="tenant-hero-logo" />
          ) : (
            <div className="tenant-hero-placeholder">{businessName.slice(0, 1)}</div>
          )}
          <div>
            <p className="eyebrow">Business dashboard</p>
            <h2>{businessName}</h2>
            <p>Signed in as {user?.name}. Manage customers, products, rates, and bills.</p>
          </div>
        </div>
      </section>

      {error ? (
        <div className="form-banner" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? <p className="muted">Loading business details…</p> : null}

      <section className="stat-grid tenant-actions">
        <Link to="/customers" className="stat-card action-card">
          <p>Customers</p>
          <strong>Manage</strong>
          <span>Add and search your clients</span>
        </Link>
        <Link to="/products" className="stat-card action-card">
          <p>Products</p>
          <strong>Catalog</strong>
          <span>Dynamic products and units</span>
        </Link>
        <Link to="/billing/create" className="stat-card action-card">
          <p>Billing</p>
          <strong>Create</strong>
          <span>Multi-product bills</span>
        </Link>
        <Link to="/payments/receive" className="stat-card action-card">
          <p>Payments</p>
          <strong>Collect</strong>
          <span>Partial or full payments</span>
        </Link>
      </section>
    </main>
  );
}
