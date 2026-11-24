import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
        if (!active) {
          return;
        }

        if (requestError?.response?.status === 401 || requestError?.response?.status === 403) {
          clearSession();
          navigate("/login", { replace: true });
          return;
        }

        setError(getErrorMessage(requestError, "Could not load dashboard."));
      } finally {
        if (active) {
          setLoading(false);
        }
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
            <p>
              Signed in as {user?.name}. Orders, invoices, and production tools will appear here in
              later phases.
            </p>
          </div>
        </div>
      </section>

      {error ? (
        <div className="form-banner" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? <p className="muted">Loading business details…</p> : null}

      {!loading && dashboard ? (
        <section className="detail-grid">
          <article className="panel">
            <p className="eyebrow">Owner</p>
            <strong>{dashboard.owner_name}</strong>
          </article>
          <article className="panel">
            <p className="eyebrow">Status</p>
            <span className={`status-badge is-${dashboard.status}`}>{dashboard.status}</span>
          </article>
        </section>
      ) : null}
    </main>
  );
}
