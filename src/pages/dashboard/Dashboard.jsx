import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../services/api";
import { fetchDashboardSummary } from "../../services/auth";

const CARDS = [
  { key: "total_clients", label: "Total clients", note: "All registered businesses" },
  { key: "active_clients", label: "Active clients", note: "Can sign in" },
  { key: "suspended_clients", label: "Suspended clients", note: "Login blocked" },
  { key: "total_tenant_users", label: "Tenant users", note: "Across all clients" },
];

export default function Dashboard() {
  const { user, clearSession } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadSummary() {
      try {
        const response = await fetchDashboardSummary();

        if (active) {
          setStats(response.data.stats);
          setError("");
        }
      } catch (requestError) {
        if (!active) {
          return;
        }

        if (requestError?.response?.status === 401 || requestError?.response?.status === 403) {
          clearSession();
          navigate("/admin/login", { replace: true });
          return;
        }

        setError(getErrorMessage(requestError, "Could not load dashboard summary."));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadSummary();

    return () => {
      active = false;
    };
  }, [clearSession, navigate]);

  return (
    <main className="dashboard">
      <section className="welcome panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Welcome</p>
            <h2>Hello, {user?.name || "Super Admin"}</h2>
            <p>Overview of printing businesses on the platform.</p>
          </div>
          <Link to="/admin/clients/create" className="primary-button link-button">
            Add client
          </Link>
        </div>
      </section>

      {error ? (
        <div className="form-banner" role="alert">
          {error}
        </div>
      ) : null}

      <section className="stat-grid" aria-label="Platform statistics">
        {CARDS.map((card) => (
          <article key={card.key} className="stat-card">
            <p>{card.label}</p>
            <strong>{loading ? "…" : stats ? stats[card.key] : "—"}</strong>
            <span>{card.note}</span>
          </article>
        ))}
      </section>
    </main>
  );
}
