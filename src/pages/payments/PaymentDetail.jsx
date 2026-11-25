import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import StatusBadge from "../../components/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../services/api";
import { fetchPayment } from "../../services/payments";
import { formatMoney } from "../../utils/billingCalc";

export default function PaymentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { clearSession } = useAuth();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [flash] = useState(location.state?.flash || "");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetchPayment(id);
        if (active) setPayment(response.data.payment);
      } catch (requestError) {
        if (!active) return;
        if (requestError?.response?.status === 401 || requestError?.response?.status === 403) {
          clearSession();
          navigate("/login", { replace: true });
          return;
        }
        setError(getErrorMessage(requestError, "Could not load payment."));
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
        <p className="muted">Loading payment…</p>
      </main>
    );
  }

  if (!payment) {
    return (
      <main className="dashboard">
        <div className="form-banner" role="alert">
          {error || "Payment not found."}
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard">
      <section className="panel panel-header-row">
        <div>
          <p className="eyebrow">Payment</p>
          <h2>#{payment.id}</h2>
          <p className="muted">{payment.payment_date}</p>
        </div>
        <Link to="/payments" className="ghost-button link-button">
          Back to payments
        </Link>
      </section>

      {flash ? <div className="success-banner">{flash}</div> : null}

      <section className="detail-grid">
        <article className="panel">
          <p className="eyebrow">Amount</p>
          <strong>{formatMoney(payment.amount)}</strong>
        </article>
        <article className="panel">
          <p className="eyebrow">Method</p>
          <strong>{payment.payment_method_label}</strong>
        </article>
        <article className="panel">
          <p className="eyebrow">Customer</p>
          <strong>{payment.customer.customer_name}</strong>
          <p className="muted">{payment.customer.phone}</p>
        </article>
        <article className="panel">
          <p className="eyebrow">Bill</p>
          <Link to={`/billing/${payment.bill.id}`} className="text-link">
            {payment.bill.bill_number}
          </Link>
          <div>
            <StatusBadge status={payment.bill.payment_status} />
          </div>
        </article>
        <article className="panel">
          <p className="eyebrow">Bill total / paid / balance</p>
          <strong>
            {formatMoney(payment.bill.total_amount)} / {formatMoney(payment.bill.paid_amount)} /{" "}
            {formatMoney(payment.bill.balance_amount)}
          </strong>
        </article>
        <article className="panel">
          <p className="eyebrow">Reference</p>
          <strong>{payment.reference_number || "—"}</strong>
        </article>
        <article className="panel span-2">
          <p className="eyebrow">Notes</p>
          <strong>{payment.notes || "—"}</strong>
        </article>
      </section>
    </main>
  );
}
