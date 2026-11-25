import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import StatusBadge from "../../components/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../services/api";
import { createProductRate, fetchProductRates } from "../../services/products";
import { formatMoney } from "../../utils/billingCalc";

export default function ProductRates() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { csrfToken, clearSession } = useAuth();
  const [product, setProduct] = useState(null);
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState(location.state?.flash || "");
  const [rate, setRate] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetchProductRates(id);
      setProduct(response.data.product);
      setRates(response.data.rates || []);
    } catch (requestError) {
      if (requestError?.response?.status === 401 || requestError?.response?.status === 403) {
        clearSession();
        navigate("/login", { replace: true });
        return;
      }
      setError(getErrorMessage(requestError, "Could not load rates."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (rate === "" || Number(rate) < 0) {
      setError("Enter a valid rate.");
      return;
    }

    setSubmitting(true);
    try {
      await createProductRate(
        id,
        { rate: Number(rate), effective_from: effectiveFrom },
        csrfToken
      );
      setFlash("New rate saved. Previous rates remain in history.");
      setRate("");
      await load();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not save rate."));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !product) {
    return (
      <main className="dashboard">
        <p className="muted">Loading rates…</p>
      </main>
    );
  }

  return (
    <main className="dashboard">
      <section className="panel panel-header-row">
        <div>
          <p className="eyebrow">Rate history</p>
          <h2>{product?.product_name || "Product rates"}</h2>
          <p className="muted">
            Changing a rate creates a new record. Old bills keep the rate used when they were saved.
          </p>
        </div>
        <Link to="/products" className="ghost-button link-button">
          Back to products
        </Link>
      </section>

      {flash ? <div className="success-banner">{flash}</div> : null}
      {error ? (
        <div className="form-banner" role="alert">
          {error}
        </div>
      ) : null}

      <form className="panel form-section" onSubmit={handleSubmit}>
        <h3>Add new rate</h3>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="rate">New rate (₹)</label>
            <input
              id="rate"
              type="number"
              min="0"
              step="0.01"
              value={rate}
              onChange={(event) => setRate(event.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="field">
            <label htmlFor="effective_from">Effective from</label>
            <input
              id="effective_from"
              type="date"
              value={effectiveFrom}
              onChange={(event) => setEffectiveFrom(event.target.value)}
              disabled={submitting}
            />
          </div>
        </div>
        <div className="form-actions">
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? "Saving…" : "Save new rate"}
          </button>
        </div>
      </form>

      <section className="panel table-panel">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Rate</th>
                <th>Effective from</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{formatMoney(item.rate)}</strong>
                  </td>
                  <td>{item.effective_from}</td>
                  <td>
                    <StatusBadge status={item.status} />
                  </td>
                  <td>{item.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rates.length === 0 ? <p className="muted">No rates recorded yet.</p> : null}
      </section>
    </main>
  );
}
