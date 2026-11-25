import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import ConfirmDialog from "../../components/ConfirmDialog";
import StatusBadge from "../../components/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../services/api";
import { fetchCustomer, updateCustomerStatus } from "../../services/customers";

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { csrfToken, clearSession } = useAuth();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState(location.state?.flash || "");
  const [pendingStatus, setPendingStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetchCustomer(id);
        if (active) setCustomer(response.data.customer);
      } catch (requestError) {
        if (!active) return;
        if (requestError?.response?.status === 401 || requestError?.response?.status === 403) {
          clearSession();
          navigate("/login", { replace: true });
          return;
        }
        setError(getErrorMessage(requestError, "Could not load customer."));
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [id, clearSession, navigate]);

  async function confirmStatus() {
    if (!customer || !pendingStatus) return;
    setBusy(true);
    try {
      const response = await updateCustomerStatus(customer.id, pendingStatus, csrfToken);
      setCustomer(response.data.customer);
      setFlash(pendingStatus === "active" ? "Customer activated." : "Customer deactivated.");
      setPendingStatus(null);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not update status."));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="dashboard">
        <p className="muted">Loading customer…</p>
      </main>
    );
  }

  if (!customer) {
    return (
      <main className="dashboard">
        <div className="form-banner" role="alert">
          {error || "Customer not found."}
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard">
      <section className="panel panel-header-row">
        <div>
          <p className="eyebrow">Customer profile</p>
          <h2>{customer.customer_name}</h2>
          <StatusBadge status={customer.status} />
        </div>
        <div className="row-actions">
          <Link to={`/customers/${customer.id}/edit`} className="primary-button link-button">
            Edit
          </Link>
          <button
            type="button"
            className={customer.status === "active" ? "danger-button" : "primary-button"}
            onClick={() =>
              setPendingStatus(customer.status === "active" ? "inactive" : "active")
            }
          >
            {customer.status === "active" ? "Deactivate" : "Activate"}
          </button>
        </div>
      </section>

      {flash ? <div className="success-banner">{flash}</div> : null}
      {error ? (
        <div className="form-banner" role="alert">
          {error}
        </div>
      ) : null}

      <section className="detail-grid">
        <article className="panel">
          <p className="eyebrow">Phone</p>
          <strong>{customer.phone}</strong>
        </article>
        <article className="panel">
          <p className="eyebrow">Email</p>
          <strong>{customer.email || "—"}</strong>
        </article>
        <article className="panel span-2">
          <p className="eyebrow">Address</p>
          <strong>
            {[customer.address, customer.city].filter(Boolean).join(", ") || "—"}
          </strong>
        </article>
        <article className="panel span-2">
          <p className="eyebrow">Notes</p>
          <strong>{customer.notes || "—"}</strong>
        </article>
      </section>

      <ConfirmDialog
        open={Boolean(pendingStatus)}
        title={pendingStatus === "inactive" ? "Deactivate customer?" : "Activate customer?"}
        message={`${customer.customer_name} will be marked as ${pendingStatus}.`}
        confirmLabel={pendingStatus === "inactive" ? "Deactivate" : "Activate"}
        danger={pendingStatus === "inactive"}
        busy={busy}
        onCancel={() => setPendingStatus(null)}
        onConfirm={confirmStatus}
      />
    </main>
  );
}
