import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../services/api";
import { fetchDashboardSummary } from "../../services/auth";

const CARDS = [
  { key: "total_businesses", label: "Total businesses", note: "Placeholder" },
  { key: "active_businesses", label: "Active businesses", note: "Placeholder" },
  { key: "suspended_businesses", label: "Suspended businesses", note: "Placeholder" },
  { key: "total_users", label: "Total users", note: "From users table" },
];

export default function Dashboard() {
  const { user, clearSession } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSummary() {
      try {
        const response = await fetchDashboardSummary();

        if (active) {
          setStats(response.data.stats);
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

        setError(getErrorMessage(requestError, "Could not load dashboard summary."));
      }
    }

    loadSummary();

    return () => {
      active = false;
    };
  }, [clearSession, navigate]);

  return (
    <main className="dashboard">
      <section className="welcome">
        <p className="eyebrow">Welcome</p>
        <h2>Hello, {user?.name || "Super Admin"}</h2>
        <p>
          This is the platform dashboard. Business and tenant tools will be added
          here later. The cards below are ready for those modules.
        </p>
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
            <strong>{stats ? stats[card.key] : "—"}</strong>
            <span>{card.note}</span>
          </article>
        ))}
      </section>
    </main>
  );
}
