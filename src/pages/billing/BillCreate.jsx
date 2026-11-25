import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../services/api";
import { createBill } from "../../services/bills";
import { fetchCustomers } from "../../services/customers";
import { fetchProducts } from "../../services/products";
import { calculateLine, formatMoney, unitLabel } from "../../utils/billingCalc";

function emptyRow() {
  return {
    key: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    product_id: "",
    width: "",
    height: "",
    quantity: "1",
    rate: "",
  };
}

export default function BillCreate() {
  const navigate = useNavigate();
  const { csrfToken, clearSession } = useAuth();

  const [customerQuery, setCustomerQuery] = useState("");
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [products, setProducts] = useState([]);
  const [rows, setRows] = useState([emptyRow()]);
  const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadProducts() {
      try {
        const response = await fetchProducts({ status: "active", per_page: 50 });
        if (active) setProducts(response.data.products || []);
      } catch (requestError) {
        if (!active) return;
        if (requestError?.response?.status === 401 || requestError?.response?.status === 403) {
          clearSession();
          navigate("/login", { replace: true });
          return;
        }
        setError(getErrorMessage(requestError, "Could not load products."));
      } finally {
        if (active) setLoadingMeta(false);
      }
    }
    loadProducts();
    return () => {
      active = false;
    };
  }, [clearSession, navigate]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const response = await fetchCustomers({
          search: customerQuery,
          status: "active",
          per_page: 20,
        });
        if (active) setCustomers(response.data.customers || []);
      } catch {
        if (active) setCustomers([]);
      }
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [customerQuery]);

  const productMap = useMemo(() => {
    const map = {};
    products.forEach((product) => {
      map[product.id] = product;
    });
    return map;
  }, [products]);

  const computedRows = rows.map((row) => {
    const product = productMap[Number(row.product_id)];
    if (!product) {
      return { ...row, product: null, calc: { area: null, amount: 0, error: null } };
    }

    const calc = calculateLine({
      pricingType: product.pricing_type,
      width: row.width,
      height: row.height,
      quantity: row.quantity,
      rate: row.rate === "" ? product.current_rate : row.rate,
    });

    return { ...row, product, calc };
  });

  const totals = computedRows.reduce(
    (acc, row) => {
      acc.amount += Number(row.calc.amount) || 0;
      acc.quantity += Number(row.quantity) || 0;
      return acc;
    },
    { amount: 0, quantity: 0 }
  );

  function updateRow(key, patch) {
    setRows((current) =>
      current.map((row) => {
        if (row.key !== key) return row;
        const next = { ...row, ...patch };
        if (Object.prototype.hasOwnProperty.call(patch, "product_id")) {
          const product = productMap[Number(patch.product_id)];
          next.rate = product?.current_rate != null ? String(product.current_rate) : "";
          if (product?.pricing_type !== "dimension_based") {
            next.width = "";
            next.height = "";
          }
        }
        return next;
      })
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!selectedCustomer) {
      setError("Select a customer.");
      return;
    }

    if (computedRows.some((row) => !row.product)) {
      setError("Select a product for every line.");
      return;
    }

    if (computedRows.some((row) => row.calc.error)) {
      setError(computedRows.find((row) => row.calc.error)?.calc.error || "Check line items.");
      return;
    }

    setSubmitting(true);

    const payload = {
      customer_id: selectedCustomer.id,
      bill_date: billDate,
      items: computedRows.map((row) => ({
        product_id: Number(row.product_id),
        width: row.width === "" ? null : Number(row.width),
        height: row.height === "" ? null : Number(row.height),
        quantity: Number(row.quantity),
        rate: Number(row.rate === "" ? row.product.current_rate : row.rate),
      })),
    };

    try {
      const response = await createBill(payload, csrfToken);
      navigate(`/billing/${response.data.bill.id}`, {
        replace: true,
        state: { flash: "Bill saved successfully." },
      });
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not save bill."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="dashboard bill-create">
      <section className="panel panel-header-row">
        <div>
          <p className="eyebrow">Billing</p>
          <h2>Create bill</h2>
          <p className="muted">Select a customer, add products, and save with live totals.</p>
        </div>
      </section>

      {error ? (
        <div className="form-banner" role="alert">
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="billing-form">
        <section className="panel form-section">
          <h3>1. Customer</h3>
          {selectedCustomer ? (
            <div className="selected-customer">
              <div>
                <strong>{selectedCustomer.customer_name}</strong>
                <p className="muted">{selectedCustomer.phone}</p>
              </div>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setSelectedCustomer(null)}
              >
                Change
              </button>
            </div>
          ) : (
            <>
              <div className="field">
                <label htmlFor="customer-search">Search customers</label>
                <input
                  id="customer-search"
                  type="search"
                  placeholder="Name or phone"
                  value={customerQuery}
                  onChange={(event) => setCustomerQuery(event.target.value)}
                />
              </div>
              <div className="choice-list">
                {customers.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    className="choice-item"
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    <strong>{customer.customer_name}</strong>
                    <span>{customer.phone}</span>
                  </button>
                ))}
                {customers.length === 0 ? (
                  <p className="muted">No matching active customers.</p>
                ) : null}
              </div>
              <Link to="/customers/create" className="text-link">
                + Add new customer
              </Link>
            </>
          )}
        </section>

        <section className="panel form-section">
          <div className="panel-header-row">
            <h3>2. Products</h3>
            <button
              type="button"
              className="ghost-button"
              onClick={() => setRows((current) => [...current, emptyRow()])}
            >
              Add product
            </button>
          </div>

          {loadingMeta ? <p className="muted">Loading products…</p> : null}

          <div className="bill-rows">
            {computedRows.map((row, index) => {
              const isDimension = row.product?.pricing_type === "dimension_based";

              return (
                <article key={row.key} className="bill-row">
                  <div className="bill-row-header">
                    <strong>Line {index + 1}</strong>
                    {rows.length > 1 ? (
                      <button
                        type="button"
                        className="text-link danger-link"
                        onClick={() =>
                          setRows((current) => current.filter((item) => item.key !== row.key))
                        }
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>

                  <div className="bill-row-grid">
                    <div className="field">
                      <label>Product</label>
                      <select
                        value={row.product_id}
                        onChange={(event) =>
                          updateRow(row.key, { product_id: event.target.value })
                        }
                      >
                        <option value="">Select product</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.product_name}
                            {product.current_rate != null
                              ? ` · ${formatMoney(product.current_rate)}`
                              : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="field">
                      <label>Unit</label>
                      <input
                        value={row.product ? unitLabel(row.product.unit) : "—"}
                        disabled
                      />
                    </div>

                    <div className="field">
                      <label>Rate (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.rate}
                        onChange={(event) => updateRow(row.key, { rate: event.target.value })}
                      />
                    </div>

                    {isDimension ? (
                      <>
                        <div className="field">
                          <label>Width</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.width}
                            onChange={(event) =>
                              updateRow(row.key, { width: event.target.value })
                            }
                          />
                        </div>
                        <div className="field">
                          <label>Height</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.height}
                            onChange={(event) =>
                              updateRow(row.key, { height: event.target.value })
                            }
                          />
                        </div>
                      </>
                    ) : null}

                    <div className="field">
                      <label>Quantity</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.quantity}
                        onChange={(event) =>
                          updateRow(row.key, { quantity: event.target.value })
                        }
                      />
                    </div>

                    <div className="field">
                      <label>Area</label>
                      <input
                        value={row.calc.area != null ? row.calc.area : "—"}
                        disabled
                      />
                    </div>

                    <div className="field">
                      <label>Amount</label>
                      <input value={formatMoney(row.calc.amount)} disabled />
                    </div>
                  </div>

                  {row.calc.error ? <p className="field-error">{row.calc.error}</p> : null}
                </article>
              );
            })}
          </div>
        </section>

        <section className="panel form-section bill-summary">
          <h3>3. Summary</h3>
          <div className="detail-grid">
            <article className="panel nested-panel">
              <p className="eyebrow">Customer</p>
              <strong>
                {selectedCustomer
                  ? `${selectedCustomer.customer_name} · ${selectedCustomer.phone}`
                  : "Not selected"}
              </strong>
            </article>
            <article className="panel nested-panel">
              <p className="eyebrow">Bill date</p>
              <input
                type="date"
                value={billDate}
                onChange={(event) => setBillDate(event.target.value)}
              />
            </article>
            <article className="panel nested-panel">
              <p className="eyebrow">Total quantity</p>
              <strong>{totals.quantity}</strong>
            </article>
            <article className="panel nested-panel">
              <p className="eyebrow">Total amount</p>
              <strong>{formatMoney(totals.amount)}</strong>
            </article>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => navigate("/billing")}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={submitting}>
              {submitting ? "Saving…" : "Save bill"}
            </button>
          </div>
        </section>
      </form>
    </main>
  );
}
