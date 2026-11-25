import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../services/api";
import {
  createCustomer,
  fetchCustomer,
  updateCustomer,
} from "../../services/customers";

const EMPTY = {
  customer_name: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  notes: "",
  status: "active",
};

export default function CustomerFormPage({ mode = "create" }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { csrfToken, clearSession } = useAuth();
  const [values, setValues] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(mode === "edit");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (mode !== "edit") return undefined;
    let active = true;

    async function load() {
      try {
        const response = await fetchCustomer(id);
        if (!active) return;
        const customer = response.data.customer;
        setValues({
          customer_name: customer.customer_name || "",
          phone: customer.phone || "",
          email: customer.email || "",
          address: customer.address || "",
          city: customer.city || "",
          notes: customer.notes || "",
          status: customer.status || "active",
        });
      } catch (requestError) {
        if (!active) return;
        if (requestError?.response?.status === 401 || requestError?.response?.status === 403) {
          clearSession();
          navigate("/login", { replace: true });
          return;
        }
        setError(getErrorMessage(requestError, "Could not load customer."));
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [mode, id, clearSession, navigate]);

  function validate() {
    const errors = {};
    if (!values.customer_name.trim()) errors.customer_name = "Name is required.";
    if (!values.phone.trim()) errors.phone = "Phone is required.";
    else if (!/^[0-9+\-]{7,20}$/.test(values.phone.replace(/\s+/g, ""))) {
      errors.phone = "Enter a valid phone number.";
    }
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      errors.email = "Enter a valid email.";
    }
    return errors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    const payload = {
      ...values,
      customer_name: values.customer_name.trim(),
      phone: values.phone.replace(/\s+/g, ""),
      email: values.email.trim(),
      address: values.address.trim(),
      city: values.city.trim(),
      notes: values.notes.trim(),
    };

    try {
      if (mode === "create") {
        const response = await createCustomer(payload, csrfToken);
        navigate(`/customers/${response.data.customer.id}`, {
          replace: true,
          state: { flash: "Customer created successfully." },
        });
      } else {
        await updateCustomer(id, payload, csrfToken);
        navigate(`/customers/${id}`, {
          replace: true,
          state: { flash: "Customer updated successfully." },
        });
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not save customer."));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="dashboard">
        <p className="muted">Loading customer…</p>
      </main>
    );
  }

  return (
    <main className="dashboard">
      <section className="panel panel-header-row">
        <div>
          <p className="eyebrow">Customers</p>
          <h2>{mode === "create" ? "Add customer" : "Edit customer"}</h2>
        </div>
      </section>

      <form className="panel form-section" onSubmit={handleSubmit} noValidate>
        {error ? (
          <div className="form-banner" role="alert">
            {error}
          </div>
        ) : null}

        <div className="form-grid">
          <Field
            label="Customer name"
            value={values.customer_name}
            error={fieldErrors.customer_name}
            onChange={(value) => setValues((current) => ({ ...current, customer_name: value }))}
          />
          <Field
            label="Phone"
            value={values.phone}
            error={fieldErrors.phone}
            onChange={(value) => setValues((current) => ({ ...current, phone: value }))}
          />
          <Field
            label="Email (optional)"
            type="email"
            value={values.email}
            error={fieldErrors.email}
            onChange={(value) => setValues((current) => ({ ...current, email: value }))}
          />
          <Field
            label="City (optional)"
            value={values.city}
            onChange={(value) => setValues((current) => ({ ...current, city: value }))}
          />
          <Field
            label="Address (optional)"
            value={values.address}
            className="span-2"
            onChange={(value) => setValues((current) => ({ ...current, address: value }))}
          />
          <div className="field span-2">
            <label htmlFor="notes">Notes (optional)</label>
            <textarea
              id="notes"
              rows={3}
              value={values.notes}
              onChange={(event) =>
                setValues((current) => ({ ...current, notes: event.target.value }))
              }
            />
          </div>
          <div className="field">
            <label>Status</label>
            <div className="status-options">
              <label className="choice">
                <input
                  type="radio"
                  checked={values.status === "active"}
                  onChange={() => setValues((current) => ({ ...current, status: "active" }))}
                />
                Active
              </label>
              <label className="choice">
                <input
                  type="radio"
                  checked={values.status === "inactive"}
                  onChange={() => setValues((current) => ({ ...current, status: "inactive" }))}
                />
                Inactive
              </label>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={() => navigate(mode === "edit" ? `/customers/${id}` : "/customers")}
            disabled={submitting}
          >
            Cancel
          </button>
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? "Saving…" : mode === "create" ? "Create customer" : "Save changes"}
          </button>
        </div>
      </form>
    </main>
  );
}

function Field({ label, value, onChange, error, type = "text", className = "" }) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className={`field ${className}`.trim()}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? "true" : "false"}
      />
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}
