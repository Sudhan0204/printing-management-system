import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ConfirmDialog from "../../components/ConfirmDialog";
import StatusBadge from "../../components/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../services/api";
import { fetchCustomers, updateCustomerStatus } from "../../services/customers";

export default function CustomersList() {
  const { csrfToken, clearSession } = useAuth();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0 });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetchCustomers({
          search,
          status,
          page,
          per_page: 10,
        });
        if (!active) return;
        setCustomers(response.data.customers || []);
        setPagination(response.data.pagination || { page: 1, total_pages: 1, total: 0 });
      } catch (requestError) {
        if (!active) return;
        if (requestError?.response?.status === 401 || requestError?.response?.status === 403) {
          clearSession();
          navigate("/login", { replace: true });
          return;
        }
        setError(getErrorMessage(requestError, "Could not load customers."));
      } finally {
        if (active) setLoading(false);
      }
    }

    const timer = setTimeout(load, search ? 250 : 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, status, page, clearSession, navigate]);

  async function confirmStatus() {
    if (!pending) return;
    setBusy(true);
    try {
      await updateCustomerStatus(pending.id, pending.nextStatus, csrfToken);
      setCustomers((current) =>
        current.map((item) =>
          item.id === pending.id ? { ...item, status: pending.nextStatus } : item
        )
      );
      setPending(null);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not update status."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="dashboard">
      <section className="panel panel-header-row">
        <div>
          <p className="eyebrow">Customers</p>
          <h2>Your customers</h2>
          <p className="muted">Manage people and businesses you bill.</p>
        </div>
        <Link to="/customers/create" className="primary-button link-button">
          Add customer
        </Link>
      </section>

      <section className="panel filters-bar">
        <input
          type="search"
          placeholder="Search by name, phone, email, or city"
          value={search}
          onChange={(event) => {
            setPage(1);
            setSearch(event.target.value);
          }}
        />
        <select
          value={status}
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value);
          }}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </section>

      {error ? (
        <div className="form-banner" role="alert">
          {error}
        </div>
      ) : null}

      <section className="panel table-panel">
        {loading ? <p className="muted">Loading customers…</p> : null}
        {!loading && customers.length === 0 ? (
          <div className="empty-state">
            <h3>No customers yet</h3>
            <p>Add your first customer to start creating bills.</p>
            <Link to="/customers/create" className="primary-button link-button">
              Add customer
            </Link>
          </div>
        ) : null}

        {!loading && customers.length > 0 ? (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>City</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id}>
                      <td>
                        <strong>{customer.customer_name}</strong>
                        {customer.email ? <p className="muted">{customer.email}</p> : null}
                      </td>
                      <td>{customer.phone}</td>
                      <td>{customer.city || "—"}</td>
                      <td>
                        <StatusBadge status={customer.status} />
                      </td>
                      <td>
                        <div className="row-actions">
                          <Link to={`/customers/${customer.id}`} className="text-link">
                            View
                          </Link>
                          <Link to={`/customers/${customer.id}/edit`} className="text-link">
                            Edit
                          </Link>
                          <button
                            type="button"
                            className="text-link"
                            onClick={() =>
                              setPending({
                                id: customer.id,
                                name: customer.customer_name,
                                nextStatus: customer.status === "active" ? "inactive" : "active",
                              })
                            }
                          >
                            {customer.status === "active" ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <button
                type="button"
                className="ghost-button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </button>
              <span>
                Page {pagination.page} of {pagination.total_pages} · {pagination.total} customers
              </span>
              <button
                type="button"
                className="ghost-button"
                disabled={page >= pagination.total_pages}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </button>
            </div>
          </>
        ) : null}
      </section>

      <ConfirmDialog
        open={Boolean(pending)}
        title={pending?.nextStatus === "inactive" ? "Deactivate customer?" : "Activate customer?"}
        message={`${pending?.name} will be marked as ${pending?.nextStatus}.`}
        confirmLabel={pending?.nextStatus === "inactive" ? "Deactivate" : "Activate"}
        danger={pending?.nextStatus === "inactive"}
        busy={busy}
        onCancel={() => setPending(null)}
        onConfirm={confirmStatus}
      />
    </main>
  );
}
