import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import StatusBadge from "../../components/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../services/api";
import { fetchBill } from "../../services/bills";
import { formatMoney } from "../../utils/billingCalc";

export default function BillDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { clearSession } = useAuth();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [flash] = useState(location.state?.flash || "");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetchBill(id);
        if (active) setBill(response.data.bill);
      } catch (requestError) {
        if (!active) return;
        if (requestError?.response?.status === 401 || requestError?.response?.status === 403) {
          clearSession();
          navigate("/login", { replace: true });
          return;
        }
        setError(getErrorMessage(requestError, "Could not load bill."));
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [id, clearSession, navigate]);

  if (loading) {
    return (
      <main className="dashboard">
        <p className="muted">Loading bill…</p>
      </main>
    );
  }

  if (!bill) {
    return (
      <main className="dashboard">
        <div className="form-banner" role="alert">
          {error || "Bill not found."}
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard">
      <section className="panel panel-header-row">
        <div>
          <p className="eyebrow">Bill</p>
          <h2>{bill.bill_number}</h2>
          <p className="muted">Dated {bill.bill_date}</p>
          <StatusBadge status={bill.payment_status} />
        </div>
        <div className="row-actions">
          {bill.payment_status !== "paid" ? (
            <Link
              to={`/payments/receive?customer_id=${bill.customer.id}&bill_id=${bill.id}`}
              className="primary-button link-button"
            >
              Receive payment
            </Link>
          ) : null}
          <Link to="/billing" className="ghost-button link-button">
            Back to bills
          </Link>
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
          <p className="eyebrow">Customer</p>
          <strong>{bill.customer.customer_name}</strong>
          <p className="muted">{bill.customer.phone}</p>
        </article>
        <article className="panel">
          <p className="eyebrow">Bill total</p>
          <strong>{formatMoney(bill.total_amount)}</strong>
          <p className="muted">Qty {bill.total_quantity}</p>
        </article>
        <article className="panel">
          <p className="eyebrow">Paid</p>
          <strong>{formatMoney(bill.paid_amount)}</strong>
        </article>
        <article className="panel">
          <p className="eyebrow">Outstanding</p>
          <strong>{formatMoney(bill.balance_amount)}</strong>
        </article>
      </section>

      <section className="panel table-panel">
        <h3>Line items</h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Details</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {bill.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.product_name}</strong>
                    <p className="muted">
                      {item.unit_label} · {item.pricing_type_label}
                    </p>
                  </td>
                  <td>
                    {item.pricing_type === "dimension_based" ? (
                      <span>
                        {item.width} × {item.height} × {item.quantity}
                        {item.area != null ? ` = ${item.area}` : ""}
                      </span>
                    ) : (
                      <span>Qty {item.quantity}</span>
                    )}
                  </td>
                  <td>{formatMoney(item.rate)}</td>
                  <td>{formatMoney(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel table-panel">
        <h3>Payment history</h3>
        {(bill.payments || []).length === 0 ? (
          <p className="muted">No payments recorded for this bill yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {bill.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{payment.payment_date}</td>
                    <td>{payment.payment_method_label}</td>
                    <td>{payment.reference_number || "—"}</td>
                    <td>{formatMoney(payment.amount)}</td>
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
        )}
      </section>
    </main>
  );
}
