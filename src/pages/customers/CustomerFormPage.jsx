import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../services/api";
import {
  createCustomer,
  fetchCustomer,
  updateCustomer,
} from "../../services/customers";
import {
  LIMITS,
  digitsOnly,
  firstErrorKey,
  focusField,
  mapApiErrors,
  normalizePhone,
  validateEmail,
  validateIndianMobile,
  validateLength,
  validateName,
} from "../../utils/validate";

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
  const [touched, setTouched] = useState({});
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

  function validate(nextValues = values) {
    const errors = {};

    const nameError = validateName(nextValues.customer_name, "Customer name", LIMITS.customer_name);
    if (nameError) errors.customer_name = nameError;

    const phoneError = validateIndianMobile(nextValues.phone);
    if (phoneError) errors.phone = phoneError;

    const emailError = validateEmail(nextValues.email, false);
    if (emailError) errors.email = emailError;

    const addressError = validateLength(nextValues.address, {
      ...LIMITS.address,
      label: "Address",
      required: false,
    });
    if (addressError) errors.address = addressError;

    const cityError = validateLength(nextValues.city, {
      ...LIMITS.city,
      label: "City",
      required: false,
    });
    if (cityError) errors.city = cityError;

    const notesError = validateLength(nextValues.notes, {
      ...LIMITS.notes,
      label: "Notes",
      required: false,
    });
    if (notesError) errors.notes = notesError;

    return errors;
  }

  function updateField(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function handleBlur(field) {
    setTouched((current) => ({ ...current, [field]: true }));
    const message = validate()[field];
    if (message) {
      setFieldErrors((current) => ({ ...current, [field]: message }));
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    const errors = validate();
    setFieldErrors(errors);
    setTouched({
      customer_name: true,
      phone: true,
      email: true,
      address: true,
      city: true,
      notes: true,
    });

    if (Object.keys(errors).length > 0) {
      focusField(firstErrorKey(errors));
      return;
    }

    setSubmitting(true);
    const payload = {
      customer_name: values.customer_name.trim(),
      phone: normalizePhone(values.phone),
      email: values.email.trim().toLowerCase(),
      address: values.address.trim(),
      city: values.city.trim(),
      notes: values.notes.trim(),
      status: values.status,
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
      const mapped = mapApiErrors(requestError);
      if (mapped.form) setError(mapped.form);
      const { form, ...rest } = mapped;
      setFieldErrors(rest);
      if (firstErrorKey(rest)) focusField(firstErrorKey(rest));
      if (!mapped.form && !Object.keys(rest).length) {
        setError(getErrorMessage(requestError, "Could not save customer."));
      }
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
            name="customer_name"
            value={values.customer_name}
            maxLength={LIMITS.customer_name.max}
            error={touched.customer_name ? fieldErrors.customer_name : ""}
            onChange={(value) => updateField("customer_name", value)}
            onBlur={() => handleBlur("customer_name")}
            showCount
          />
          <Field
            label="Phone"
            name="phone"
            value={values.phone}
            maxLength={10}
            inputMode="numeric"
            error={touched.phone ? fieldErrors.phone : ""}
            onChange={(value) => updateField("phone", digitsOnly(value, 10))}
            onBlur={() => handleBlur("phone")}
            showCount
            help="10-digit Indian mobile number"
          />
          <Field
            label="Email (optional)"
            name="email"
            type="email"
            value={values.email}
            maxLength={LIMITS.email.max}
            error={touched.email ? fieldErrors.email : ""}
            onChange={(value) => updateField("email", value)}
            onBlur={() => handleBlur("email")}
          />
          <Field
            label="City (optional)"
            name="city"
            value={values.city}
            maxLength={LIMITS.city.max}
            error={touched.city ? fieldErrors.city : ""}
            onChange={(value) => updateField("city", value)}
            onBlur={() => handleBlur("city")}
            showCount
          />
          <Field
            label="Address (optional)"
            name="address"
            value={values.address}
            maxLength={LIMITS.address.max}
            error={touched.address ? fieldErrors.address : ""}
            onChange={(value) => updateField("address", value)}
            onBlur={() => handleBlur("address")}
            className="span-2"
            showCount
          />
          <div className="field span-2">
            <label htmlFor="notes">Notes (optional)</label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              maxLength={LIMITS.notes.max}
              value={values.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              onBlur={() => handleBlur("notes")}
              className={touched.notes && fieldErrors.notes ? "is-invalid" : ""}
            />
            <p className="help-text char-count">
              {values.notes.length}/{LIMITS.notes.max}
            </p>
            {touched.notes && fieldErrors.notes ? (
              <p className="field-error">{fieldErrors.notes}</p>
            ) : null}
          </div>
          <div className="field">
            <label>Status</label>
            <div className="status-options">
              <label className="choice">
                <input
                  type="radio"
                  checked={values.status === "active"}
                  onChange={() => updateField("status", "active")}
                />
                Active
              </label>
              <label className="choice">
                <input
                  type="radio"
                  checked={values.status === "inactive"}
                  onChange={() => updateField("status", "inactive")}
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

function Field({
  label,
  name,
  value,
  onChange,
  onBlur,
  error,
  type = "text",
  className = "",
  maxLength,
  inputMode,
  showCount = false,
  help,
}) {
  return (
    <div className={`field ${className}`.trim()}>
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        maxLength={maxLength}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        className={error ? "is-invalid" : ""}
        aria-invalid={error ? "true" : "false"}
      />
      {showCount && maxLength ? (
        <p className="help-text char-count">
          {String(value || "").length}/{maxLength}
          {help ? ` · ${help}` : ""}
        </p>
      ) : help ? (
        <p className="help-text">{help}</p>
      ) : null}
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}
