import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../services/api";
import { fetchCustomers } from "../../services/customers";
import { createPayment, fetchOutstandingBills } from "../../services/payments";
import { formatMoney } from "../../utils/billingCalc";
import {
  LIMITS,
  PAYMENT_METHODS,
  firstErrorKey,
  focusField,
  mapApiErrors,
  validateLength,
  validateMoney,
  validateRequired,
} from "../../utils/validate";

export default function ReceivePayment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { csrfToken, clearSession } = useAuth();

  const [customerQuery, setCustomerQuery] = useState("");
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [bills, setBills] = useState([]);
  const [selectedBillId, setSelectedBillId] = useState(searchParams.get("bill_id") || "");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("cash");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingBills, setLoadingBills] = useState(false);

  const prefilledCustomerId = searchParams.get("customer_id");

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const response = await fetchCustomers({
          search: customerQuery,
          status: "active",
          per_page: 20,
        });
        if (!active) return;
        setCustomers(response.data.customers || []);

        if (prefilledCustomerId && !selectedCustomer) {
          const match = (response.data.customers || []).find(
            (item) => String(item.id) === String(prefilledCustomerId)
          );
          if (match) setSelectedCustomer(match);
        }
      } catch (requestError) {
        if (requestError?.response?.status === 401 || requestError?.response?.status === 403) {
          clearSession();
          navigate("/login", { replace: true });
        }
      }
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [customerQuery, clearSession, navigate, prefilledCustomerId, selectedCustomer]);

  useEffect(() => {
    if (!selectedCustomer) {
      setBills([]);
      return undefined;
    }

    let active = true;
    async function loadBills() {
      setLoadingBills(true);
      setFormError("");
      try {
        const response = await fetchOutstandingBills(selectedCustomer.id);
        if (!active) return;
        setBills(response.data.bills || []);
        if (
          selectedBillId &&
          !(response.data.bills || []).some((bill) => String(bill.id) === String(selectedBillId))
        ) {
          setSelectedBillId("");
        }
      } catch (requestError) {
        if (!active) return;
        setFormError(getErrorMessage(requestError, "Could not load outstanding bills."));
        setBills([]);
      } finally {
        if (active) setLoadingBills(false);
      }
    }

    loadBills();
    return () => {
      active = false;
    };
  }, [selectedCustomer, selectedBillId]);

  const selectedBill = useMemo(
    () => bills.find((bill) => String(bill.id) === String(selectedBillId)) || null,
    [bills, selectedBillId]
  );

  const remainingAfter = useMemo(() => {
    if (!selectedBill) return null;
    const pay = Number(amount);
    if (!Number.isFinite(pay)) return selectedBill.balance_amount;
    return Math.max(roundMoney(selectedBill.balance_amount - pay), 0);
  }, [selectedBill, amount]);

  function validate() {
    const errors = {};
    if (!selectedCustomer) errors.customer_id = "Select a customer.";
    if (!selectedBill) errors.bill_id = "Select a bill.";
    const dateError = validateRequired(paymentDate, "Payment date");
    if (dateError) errors.payment_date = dateError;
    if (!method) errors.payment_method = "Select a payment method.";

    const amountError = validateMoney(amount, "Payment amount");
    if (amountError) errors.amount = amountError;
    else if (selectedBill && Number(amount) - selectedBill.balance_amount > 0.009) {
      errors.amount = "Payment amount cannot exceed the outstanding balance.";
    }

    if (["bank_transfer", "upi", "card"].includes(method) && !reference.trim()) {
      errors.reference_number = "Reference number is required for this payment method.";
    } else {
      const referenceError = validateLength(reference, {
        ...LIMITS.reference_number,
        label: "Reference number",
        required: false,
      });
      if (referenceError) errors.reference_number = referenceError;
    }

    const notesError = validateLength(notes, {
      ...LIMITS.notes,
      label: "Notes",
      required: false,
    });
    if (notesError) errors.notes = notesError;

    return errors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      focusField(firstErrorKey(errors));
      return;
    }

    setSubmitting(true);
    try {
      const response = await createPayment(
        {
          customer_id: selectedCustomer.id,
          bill_id: selectedBill.id,
          payment_date: paymentDate,
          payment_method: method,
          amount: Number(amount),
          reference_number: reference.trim(),
          notes: notes.trim(),
        },
        csrfToken
      );
      navigate(`/payments/${response.data.payment.id}`, {
        replace: true,
        state: { flash: "Payment recorded successfully." },
      });
    } catch (requestError) {
      const mapped = mapApiErrors(requestError);
      if (mapped.form) setFormError(mapped.form);
      const { form, ...rest } = mapped;
      setFieldErrors(rest);
      if (firstErrorKey(rest)) focusField(firstErrorKey(rest));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="dashboard">
      <section className="panel panel-header-row">
        <div>
          <p className="eyebrow">Payments</p>
          <h2>Receive payment</h2>
          <p className="muted">Select a customer and bill, then record the amount received.</p>
        </div>
        <Link to="/payments" className="ghost-button link-button">
          Back
        </Link>
      </section>

      <form className="billing-form" onSubmit={handleSubmit} noValidate>
        {formError ? (
          <div className="form-banner" role="alert">
            {formError}
          </div>
        ) : null}

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
                onClick={() => {
                  setSelectedCustomer(null);
                  setSelectedBillId("");
                  setBills([]);
                }}
              >
                Change
              </button>
            </div>
          ) : (
            <>
              <div className="field">
                <label htmlFor="customer_search">Search customers</label>
                <input
                  id="customer_search"
                  name="customer_id"
                  type="search"
                  value={customerQuery}
                  onChange={(event) => setCustomerQuery(event.target.value)}
                />
                {fieldErrors.customer_id ? (
                  <p className="field-error">{fieldErrors.customer_id}</p>
                ) : null}
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
              </div>
            </>
          )}
        </section>

        <section className="panel form-section">
          <h3>2. Bill</h3>
          {loadingBills ? <p className="muted">Loading outstanding bills…</p> : null}
          {!loadingBills && selectedCustomer && bills.length === 0 ? (
            <p className="muted">No outstanding bills for this customer.</p>
          ) : null}
          <div className="field">
            <label htmlFor="bill_id">Select bill</label>
            <select
              id="bill_id"
              name="bill_id"
              value={selectedBillId}
              onChange={(event) => {
                setSelectedBillId(event.target.value);
                setFieldErrors((current) => ({ ...current, bill_id: undefined, amount: undefined }));
              }}
              disabled={!selectedCustomer || bills.length === 0}
            >
              <option value="">Choose a bill</option>
              {bills.map((bill) => (
                <option key={bill.id} value={bill.id}>
                  {bill.bill_number} · Balance {formatMoney(bill.balance_amount)}
                </option>
              ))}
            </select>
            {fieldErrors.bill_id ? <p className="field-error">{fieldErrors.bill_id}</p> : null}
          </div>

          {selectedBill ? (
            <div className="detail-grid">
              <article className="panel nested-panel">
                <p className="eyebrow">Bill amount</p>
                <strong>{formatMoney(selectedBill.total_amount)}</strong>
              </article>
              <article className="panel nested-panel">
                <p className="eyebrow">Already paid</p>
                <strong>{formatMoney(selectedBill.paid_amount)}</strong>
              </article>
              <article className="panel nested-panel">
                <p className="eyebrow">Outstanding</p>
                <strong>{formatMoney(selectedBill.balance_amount)}</strong>
              </article>
              <article className="panel nested-panel">
                <p className="eyebrow">Remaining after this payment</p>
                <strong>{formatMoney(remainingAfter ?? 0)}</strong>
              </article>
            </div>
          ) : null}
        </section>

        <section className="panel form-section">
          <h3>3. Payment details</h3>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="payment_date">Payment date</label>
              <input
                id="payment_date"
                name="payment_date"
                type="date"
                value={paymentDate}
                onChange={(event) => setPaymentDate(event.target.value)}
                className={fieldErrors.payment_date ? "is-invalid" : ""}
              />
              {fieldErrors.payment_date ? (
                <p className="field-error">{fieldErrors.payment_date}</p>
              ) : null}
            </div>
            <div className="field">
              <label htmlFor="payment_method">Payment method</label>
              <select
                id="payment_method"
                name="payment_method"
                value={method}
                onChange={(event) => setMethod(event.target.value)}
              >
                {PAYMENT_METHODS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="amount">Payment amount (₹)</label>
              <input
                id="amount"
                name="amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value);
                  setFieldErrors((current) => ({ ...current, amount: undefined }));
                }}
                className={fieldErrors.amount ? "is-invalid" : ""}
              />
              {fieldErrors.amount ? <p className="field-error">{fieldErrors.amount}</p> : null}
            </div>
            <div className="field">
              <label htmlFor="reference_number">Reference number</label>
              <input
                id="reference_number"
                name="reference_number"
                maxLength={LIMITS.reference_number.max}
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                className={fieldErrors.reference_number ? "is-invalid" : ""}
                placeholder={method === "cash" ? "Optional" : "UPI / txn / cheque no."}
              />
              <p className="help-text char-count">
                {reference.length}/{LIMITS.reference_number.max}
              </p>
              {fieldErrors.reference_number ? (
                <p className="field-error">{fieldErrors.reference_number}</p>
              ) : null}
            </div>
            <div className="field span-2">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                maxLength={LIMITS.notes.max}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className={fieldErrors.notes ? "is-invalid" : ""}
              />
              <p className="help-text char-count">
                {notes.length}/{LIMITS.notes.max}
              </p>
              {fieldErrors.notes ? <p className="field-error">{fieldErrors.notes}</p> : null}
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => navigate("/payments")}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={submitting}>
              {submitting ? "Saving…" : "Save payment"}
            </button>
          </div>
        </section>
      </form>
    </main>
  );
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}
