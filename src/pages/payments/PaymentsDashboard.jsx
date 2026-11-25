import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import StatusBadge from "../../components/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../services/api";
import { fetchPaymentSummary, fetchPayments } from "../../services/payments";
import { formatMoney } from "../../utils/billingCalc";

export default function PaymentsDashboard() {
  const { clearSession } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0 });
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [summaryRes, listRes] = await Promise.all([
          fetchPaymentSummary(),
          fetchPayments({
            search,
            payment_method: method || undefined,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
            page,
            per_page: 10,
          }),
        ]);
        if (!active) return;
        setSummary(summaryRes.data.summary);
        setPayments(listRes.data.payments || []);
        setPagination(listRes.data.pagination || { page: 1, total_pages: 1, total: 0 });
      } catch (requestError) {
        if (!active) return;
        if (requestError?.response?.status === 401 || requestError?.response?.status === 403) {
          clearSession();
          navigate("/login", { replace: true });
          return;
        }
        setError(getErrorMessage(requestError, "Could not load payments."));
      } finally {
        if (active) setLoading(false);
      }
    }
    const timer = setTimeout(load, search ? 250 : 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, method, dateFrom, dateTo, page, clearSession, navigate]);

  const cards = [
    { label: "Payments today", value: summary?.payments_today },
    { label: "Payments this month", value: summary?.payments_this_month },
    { label: "Outstanding balance", value: summary?.outstanding_balance },
    { label: "Unpaid bills", value: summary?.unpaid_bills, raw: true },
    { label: "Partially paid", value: summary?.partially_paid_bills, raw: true },
    { label: "Paid bills", value: summary?.paid_bills, raw: true },
  ];

  return (
    <main className="dashboard">
      <section className="panel panel-header-row">
        <div>
          <p className="eyebrow">Payments</p>
          <h2>Payment management</h2>
          <p className="muted">Collect and track payments against outstanding bills.</p>
        </div>
        <Link to="/payments/receive" className="primary-button link-button">
          Receive payment
        </Link>
      </section>

      <section className="stat-grid payment-stats">
        {cards.map((card) => (
          <article key={card.label} className="stat-card">
            <p>{card.label}</p>
            <strong>
              {loading
                ? "…"
                : card.raw
                  ? card.value ?? "—"
                  : formatMoney(card.value ?? 0)}
            </strong>
          </article>
        ))}
      </section>

      <section className="panel filters-bar payment-filters">
        <input
          type="search"
          placeholder="Search customer, bill, or reference"
          value={search}
          onChange={(event) => {
            setPage(1);
            setSearch(event.target.value);
          }}
        />
        <select
          value={method}
          onChange={(event) => {
            setPage(1);
            setMethod(event.target.value);
          }}
        >
          <option value="">All methods</option>
          <option value="cash">Cash</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="upi">UPI</option>
          <option value="card">Card</option>
          <option value="other">Other</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(event) => {
            setPage(1);
            setDateFrom(event.target.value);
          }}
          aria-label="From date"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(event) => {
            setPage(1);
            setDateTo(event.target.value);
          }}
          aria-label="To date"
        />
      </section>

      {error ? (
        <div className="form-banner" role="alert">
          {error}
        </div>
      ) : null}

      <section className="panel table-panel">
        {loading ? <p className="muted">Loading payments…</p> : null}
        {!loading && payments.length === 0 ? (
          <div className="empty-state">
            <h3>No payments yet</h3>
            <p>Record your first payment against an outstanding bill.</p>
            <Link to="/payments/receive" className="primary-button link-button">
              Receive payment
            </Link>
          </div>
        ) : null}

        {!loading && payments.length > 0 ? (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Bill</th>
                    <th>Method</th>
                    <th>Amount</th>
                    <th>Reference</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>#{payment.id}</td>
                      <td>{payment.payment_date}</td>
                      <td>
                        <strong>{payment.customer.customer_name}</strong>
                        <p className="muted">{payment.customer.phone}</p>
                      </td>
                      <td>
                        <Link to={`/billing/${payment.bill.id}`} className="text-link">
                          {payment.bill.bill_number}
                        </Link>
                        {payment.bill.payment_status ? (
                          <div>
                            <StatusBadge status={payment.bill.payment_status} />
                          </div>
                        ) : null}
                      </td>
                      <td>{payment.payment_method_label}</td>
                      <td>{formatMoney(payment.amount)}</td>
                      <td>{payment.reference_number || "—"}</td>
                      <td>
                        <Link to={`/payments/${payment.id}`} className="text-link">
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
                Page {pagination.page} of {pagination.total_pages} · {pagination.total} payments
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
