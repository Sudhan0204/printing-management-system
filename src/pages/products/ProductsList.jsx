import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ConfirmDialog from "../../components/ConfirmDialog";
import StatusBadge from "../../components/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../services/api";
import { fetchProducts, updateProductStatus } from "../../services/products";
import { formatMoney } from "../../utils/billingCalc";

export default function ProductsList() {
  const { csrfToken, clearSession } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
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
        const response = await fetchProducts({ search, status, page, per_page: 10 });
        if (!active) return;
        setProducts(response.data.products || []);
        setPagination(response.data.pagination || { page: 1, total_pages: 1, total: 0 });
      } catch (requestError) {
        if (!active) return;
        if (requestError?.response?.status === 401 || requestError?.response?.status === 403) {
          clearSession();
          navigate("/login", { replace: true });
          return;
        }
        setError(getErrorMessage(requestError, "Could not load products."));
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
      await updateProductStatus(pending.id, pending.nextStatus, csrfToken);
      setProducts((current) =>
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
          <p className="eyebrow">Products</p>
          <h2>Your products</h2>
          <p className="muted">Define what this press sells — fully dynamic per business.</p>
        </div>
        <Link to="/products/create" className="primary-button link-button">
          Add product
        </Link>
      </section>

      <section className="panel filters-bar">
        <input
          type="search"
          placeholder="Search products or categories"
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
        {loading ? <p className="muted">Loading products…</p> : null}
        {!loading && products.length === 0 ? (
          <div className="empty-state">
            <h3>No products yet</h3>
            <p>Add Flex, Vinyl, Visiting Cards, or any product your shop sells.</p>
            <Link to="/products/create" className="primary-button link-button">
              Add product
            </Link>
          </div>
        ) : null}

        {!loading && products.length > 0 ? (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Unit</th>
                    <th>Pricing</th>
                    <th>Current rate</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <strong>{product.product_name}</strong>
                        {product.category ? <p className="muted">{product.category}</p> : null}
                      </td>
                      <td>{product.unit_label}</td>
                      <td>{product.pricing_type_label}</td>
                      <td>
                        {product.current_rate !== null ? formatMoney(product.current_rate) : "—"}
                      </td>
                      <td>
                        <StatusBadge status={product.status} />
                      </td>
                      <td>
                        <div className="row-actions">
                          <Link to={`/products/${product.id}/edit`} className="text-link">
                            Edit
                          </Link>
                          <Link to={`/products/${product.id}/rates`} className="text-link">
                            Rates
                          </Link>
                          <button
                            type="button"
                            className="text-link"
                            onClick={() =>
                              setPending({
                                id: product.id,
                                name: product.product_name,
                                nextStatus: product.status === "active" ? "inactive" : "active",
                              })
                            }
                          >
                            {product.status === "active" ? "Deactivate" : "Activate"}
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
                Page {pagination.page} of {pagination.total_pages} · {pagination.total} products
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
        title={pending?.nextStatus === "inactive" ? "Deactivate product?" : "Activate product?"}
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
