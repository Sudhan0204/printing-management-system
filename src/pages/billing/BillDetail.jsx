import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
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
        </div>
        <Link to="/billing" className="ghost-button link-button">
          Back to bills
        </Link>
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
          <p className="eyebrow">Total amount</p>
          <strong>{formatMoney(bill.total_amount)}</strong>
          <p className="muted">Qty {bill.total_quantity}</p>
        </article>
      </section>

      <section className="panel table-panel">
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
    </main>
  );
}
