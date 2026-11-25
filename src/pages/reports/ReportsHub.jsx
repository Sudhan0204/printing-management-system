import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../services/api";
import { fetchReportHub } from "../../services/reports";

export default function ReportsHub() {
  const navigate = useNavigate();
  const { clearSession } = useAuth();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetchReportHub();
        if (!active) return;
        setModules(response.data.modules || []);
      } catch (requestError) {
        if (!active) return;
        if (requestError?.response?.status === 401 || requestError?.response?.status === 403) {
          clearSession();
          navigate("/login", { replace: true });
          return;
        }
        setError(getErrorMessage(requestError, "Could not load reports."));
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [clearSession, navigate]);

  return (
    <main className="dashboard">
      <section className="panel panel-header-row">
        <div>
          <p className="eyebrow">Reports</p>
          <h2>Business reports</h2>
          <p className="muted">Export customer billing data and explore upcoming report modules.</p>
        </div>
      </section>

      {error ? (
        <div className="form-banner" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? <p className="muted">Loading report modules…</p> : null}

      <section className="report-module-grid">
        {modules.map((module) => (
          <article
            key={module.key}
            className={`panel report-module-card ${module.available ? "" : "is-disabled"}`}
          >
            <p className="eyebrow">{module.available ? "Available" : "Coming soon"}</p>
            <h3>{module.title}</h3>
            <p className="muted">{module.description}</p>
            {module.available && module.path ? (
              <Link to={module.path} className="primary-button link-button">
                Open report
              </Link>
            ) : (
              <span className="ghost-button is-disabled">Not available yet</span>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}
