import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../services/api";
import { fetchBills } from "../../services/bills";
import { formatMoney } from "../../utils/billingCalc";

export default function BillsList() {
  const { clearSession } = useAuth();
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0 });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetchBills({ search, page, per_page: 10 });
        if (!active) return;
        setBills(response.data.bills || []);
        setPagination(response.data.pagination || { page: 1, total_pages: 1, total: 0 });
      } catch (requestError) {
        if (!active) return;
        if (requestError?.response?.status === 401 || requestError?.response?.status === 403) {
          clearSession();
          navigate("/login", { replace: true });
          return;
        }
        setError(getErrorMessage(requestError, "Could not load bills."));
      } finally {
        if (active) setLoading(false);
      }
    }
    const timer = setTimeout(load, search ? 250 : 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, page, clearSession, navigate]);

  return (
    <main className="dashboard">
      <section className="panel panel-header-row">
        <div>
          <p className="eyebrow">Billing</p>
          <h2>Bills</h2>
          <p className="muted">Create multi-product bills for your customers.</p>
        </div>
        <Link to="/billing/create" className="primary-button link-button">
          Create bill
        </Link>
      </section>

      <section className="panel filters-bar">
        <input
          type="search"
          placeholder="Search by bill number, customer, or phone"
          value={search}
          onChange={(event) => {
            setPage(1);
            setSearch(event.target.value);
          }}
        />
      </section>

      {error ? (
        <div className="form-banner" role="alert">
          {error}
        </div>
      ) : null}

      <section className="panel table-panel">
        {loading ? <p className="muted">Loading bills…</p> : null}
        {!loading && bills.length === 0 ? (
          <div className="empty-state">
            <h3>No bills yet</h3>
            <p>Select a customer and add products to create your first bill.</p>
            <Link to="/billing/create" className="primary-button link-button">
              Create bill
            </Link>
          </div>
        ) : null}

        {!loading && bills.length > 0 ? (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Bill</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((bill) => (
                    <tr key={bill.id}>
                      <td>
                        <strong>{bill.bill_number}</strong>
                      </td>
                      <td>
                        <div>{bill.customer.customer_name}</div>
                        <p className="muted">{bill.customer.phone}</p>
                      </td>
                      <td>{bill.bill_date}</td>
                      <td>{formatMoney(bill.total_amount)}</td>
                      <td>
                        <Link to={`/billing/${bill.id}`} className="text-link">
                          View
                        </Link>
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
                Page {pagination.page} of {pagination.total_pages} · {pagination.total} bills
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
    </main>
  );
}
