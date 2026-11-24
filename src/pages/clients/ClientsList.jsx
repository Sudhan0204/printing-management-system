import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ConfirmDialog from "../../components/ConfirmDialog";
import StatusBadge from "../../components/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../services/api";
import { fetchClients, updateClientStatus } from "../../services/clients";
import { clientLogoUrl } from "../../components/ClientForm";

export default function ClientsList() {
  const { csrfToken, clearSession } = useAuth();
  const navigate = useNavigate();

  const [clients, setClients] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0 });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingStatus, setPendingStatus] = useState(null);
  const [statusBusy, setStatusBusy] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const response = await fetchClients({ search, status, page, perPage: 10 });

        if (!active) {
          return;
        }

        setClients(response.data.clients || []);
        setPagination(response.data.pagination || { page: 1, total_pages: 1, total: 0 });
      } catch (requestError) {
        if (!active) {
          return;
        }

        if (requestError?.response?.status === 401 || requestError?.response?.status === 403) {
          clearSession();
          navigate("/admin/login", { replace: true });
          return;
        }

        setError(getErrorMessage(requestError, "Could not load clients."));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    const timer = setTimeout(load, search ? 250 : 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, status, page, clearSession, navigate]);

  async function confirmStatusChange() {
    if (!pendingStatus) {
      return;
    }

    setStatusBusy(true);

    try {
      await updateClientStatus(pendingStatus.id, pendingStatus.nextStatus, csrfToken);
      setClients((current) =>
        current.map((client) =>
          client.id === pendingStatus.id
            ? { ...client, status: pendingStatus.nextStatus }
            : client
        )
      );
      setPendingStatus(null);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not update client status."));
    } finally {
      setStatusBusy(false);
    }
  }

  return (
    <main className="dashboard clients-page">
      <section className="panel panel-header-row">
        <div>
          <p className="eyebrow">Clients</p>
          <h2>Printing businesses</h2>
          <p className="muted">Search, review, suspend, or activate client accounts.</p>
        </div>
        <Link to="/admin/clients/create" className="primary-button link-button">
          Add client
        </Link>
      </section>

      <section className="panel filters-bar">
        <input
          type="search"
          placeholder="Search by business, owner, email, or phone"
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
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </section>

      {error ? (
        <div className="form-banner" role="alert">
          {error}
        </div>
      ) : null}

      <section className="panel table-panel">
        {loading ? <p className="muted">Loading clients…</p> : null}

        {!loading && clients.length === 0 ? (
          <div className="empty-state">
            <h3>No clients found</h3>
            <p>Create your first printing business client to get started.</p>
            <Link to="/admin/clients/create" className="primary-button link-button">
              Add client
            </Link>
          </div>
        ) : null}

        {!loading && clients.length > 0 ? (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Business</th>
                    <th>Owner</th>
                    <th>Contact</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => {
                    const logo = clientLogoUrl(client);

                    return (
                      <tr key={client.id}>
                        <td>
                          <div className="client-cell">
                            {logo ? (
                              <img src={logo} alt="" className="table-logo" />
                            ) : (
                              <span className="table-logo placeholder">
                                {client.business_name.slice(0, 1)}
                              </span>
                            )}
                            <div>
                              <strong>{client.business_name}</strong>
                              <p className="muted">{client.email}</p>
                            </div>
                          </div>
                        </td>
                        <td>{client.owner_name}</td>
                        <td>
                          <div>
                            <div>{client.phone}</div>
                            <p className="muted">{client.city}</p>
                          </div>
                        </td>
                        <td>
                          <StatusBadge status={client.status} />
                        </td>
                        <td>{formatDate(client.created_at)}</td>
                        <td>
                          <div className="row-actions">
                            <Link to={`/admin/clients/${client.id}`} className="text-link">
                              View
                            </Link>
                            <Link to={`/admin/clients/${client.id}/edit`} className="text-link">
                              Edit
                            </Link>
                            {client.status === "active" ? (
                              <button
                                type="button"
                                className="text-link danger-link"
                                onClick={() =>
                                  setPendingStatus({
                                    id: client.id,
                                    name: client.business_name,
                                    nextStatus: "suspended",
                                  })
                                }
                              >
                                Suspend
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="text-link"
                                onClick={() =>
                                  setPendingStatus({
                                    id: client.id,
                                    name: client.business_name,
                                    nextStatus: "active",
                                  })
                                }
                              >
                                Activate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
                Page {pagination.page} of {pagination.total_pages} · {pagination.total} clients
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
        open={Boolean(pendingStatus)}
        title={pendingStatus?.nextStatus === "suspended" ? "Suspend client?" : "Activate client?"}
        message={
          pendingStatus?.nextStatus === "suspended"
            ? `${pendingStatus?.name} will not be able to sign in until reactivated.`
            : `${pendingStatus?.name} will regain access to the business portal.`
        }
        confirmLabel={pendingStatus?.nextStatus === "suspended" ? "Suspend" : "Activate"}
        danger={pendingStatus?.nextStatus === "suspended"}
        busy={statusBusy}
        onCancel={() => setPendingStatus(null)}
        onConfirm={confirmStatusChange}
      />
    </main>
  );
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
}
