import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../services/api";
import { createProduct, fetchProduct, updateProduct } from "../../services/products";
import { PRICING_TYPES, UNITS } from "../../utils/billingCalc";
import {
  LIMITS,
  firstErrorKey,
  focusField,
  mapApiErrors,
  validateLength,
  validateMoney,
  validateName,
} from "../../utils/validate";

const EMPTY = {
  product_name: "",
  category: "",
  description: "",
  unit: "sq_ft",
  pricing_type: "dimension_based",
  status: "active",
  initial_rate: "",
  effective_from: new Date().toISOString().slice(0, 10),
};

export default function ProductFormPage({ mode = "create" }) {
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
        const response = await fetchProduct(id);
        if (!active) return;
        const product = response.data.product;
        setValues({
          product_name: product.product_name || "",
          category: product.category || "",
          description: product.description || "",
          unit: product.unit || "piece",
          pricing_type: product.pricing_type || "fixed_price",
          status: product.status || "active",
          initial_rate: "",
          effective_from: new Date().toISOString().slice(0, 10),
        });
      } catch (requestError) {
        if (!active) return;
        if (requestError?.response?.status === 401 || requestError?.response?.status === 403) {
          clearSession();
          navigate("/login", { replace: true });
          return;
        }
        setError(getErrorMessage(requestError, "Could not load product."));
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

    const nameError = validateName(nextValues.product_name, "Product name", LIMITS.product_name);
    if (nameError) errors.product_name = nameError;

    const categoryError = validateLength(nextValues.category, {
      ...LIMITS.category,
      label: "Category",
      required: false,
    });
    if (categoryError) errors.category = categoryError;

    const descriptionError = validateLength(nextValues.description, {
      ...LIMITS.description,
      label: "Description",
      required: false,
    });
    if (descriptionError) errors.description = descriptionError;

    if (mode === "create") {
      const rateError = validateMoney(nextValues.initial_rate, "Initial rate", { allowZero: true });
      if (rateError) errors.initial_rate = rateError;

      if (!nextValues.effective_from) {
        errors.effective_from = "Effective from date is required.";
      }
    }

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
      product_name: true,
      category: true,
      description: true,
      initial_rate: true,
      effective_from: true,
    });

    if (Object.keys(errors).length > 0) {
      focusField(firstErrorKey(errors));
      return;
    }

    setSubmitting(true);
    const payload = {
      product_name: values.product_name.trim(),
      category: values.category.trim(),
      description: values.description.trim(),
      unit: values.unit,
      pricing_type: values.pricing_type,
      status: values.status,
    };

    try {
      if (mode === "create") {
        payload.initial_rate = Number(values.initial_rate);
        payload.effective_from = values.effective_from;
        const response = await createProduct(payload, csrfToken);
        navigate(`/products/${response.data.product.id}/rates`, {
          replace: true,
          state: { flash: "Product created successfully." },
        });
      } else {
        await updateProduct(id, payload, csrfToken);
        navigate("/products", {
          replace: true,
          state: { flash: "Product updated successfully." },
        });
      }
    } catch (requestError) {
      const mapped = mapApiErrors(requestError);
      if (mapped.form) setError(mapped.form);
      const { form, ...rest } = mapped;
      setFieldErrors(rest);
      if (firstErrorKey(rest)) focusField(firstErrorKey(rest));
      if (!mapped.form && !Object.keys(rest).length) {
        setError(getErrorMessage(requestError, "Could not save product."));
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="dashboard">
        <p className="muted">Loading product…</p>
      </main>
    );
  }

  return (
    <main className="dashboard">
      <section className="panel panel-header-row">
        <div>
          <p className="eyebrow">Products</p>
          <h2>{mode === "create" ? "Add product" : "Edit product"}</h2>
          <p className="muted">
            Examples: Flex, Vinyl, UV, Visiting Card — create only what your shop sells.
          </p>
        </div>
      </section>

      <form className="panel form-section" onSubmit={handleSubmit} noValidate>
        {error ? (
          <div className="form-banner" role="alert">
            {error}
          </div>
        ) : null}

        <div className="form-grid">
          <div className="field">
            <label htmlFor="product_name">Product name</label>
            <input
              id="product_name"
              name="product_name"
              maxLength={LIMITS.product_name.max}
              value={values.product_name}
              onChange={(event) => updateField("product_name", event.target.value)}
              onBlur={() => handleBlur("product_name")}
              className={touched.product_name && fieldErrors.product_name ? "is-invalid" : ""}
            />
            <p className="help-text char-count">
              {values.product_name.length}/{LIMITS.product_name.max}
            </p>
            {touched.product_name && fieldErrors.product_name ? (
              <p className="field-error">{fieldErrors.product_name}</p>
            ) : null}
          </div>
          <div className="field">
            <label htmlFor="category">Category (optional)</label>
            <input
              id="category"
              name="category"
              maxLength={LIMITS.category.max}
              value={values.category}
              onChange={(event) => updateField("category", event.target.value)}
              onBlur={() => handleBlur("category")}
              className={touched.category && fieldErrors.category ? "is-invalid" : ""}
            />
            <p className="help-text char-count">
              {values.category.length}/{LIMITS.category.max}
            </p>
            {touched.category && fieldErrors.category ? (
              <p className="field-error">{fieldErrors.category}</p>
            ) : null}
          </div>
          <div className="field">
            <label htmlFor="unit">Unit</label>
            <select
              id="unit"
              name="unit"
              value={values.unit}
              onChange={(event) => updateField("unit", event.target.value)}
            >
              {UNITS.map((unit) => (
                <option key={unit.value} value={unit.value}>
                  {unit.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="pricing_type">Pricing type</label>
            <select
              id="pricing_type"
              name="pricing_type"
              value={values.pricing_type}
              onChange={(event) => updateField("pricing_type", event.target.value)}
            >
              {PRICING_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          {mode === "create" ? (
            <>
              <div className="field">
                <label htmlFor="initial_rate">Initial rate (₹)</label>
                <input
                  id="initial_rate"
                  name="initial_rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={values.initial_rate}
                  onChange={(event) => updateField("initial_rate", event.target.value)}
                  onBlur={() => handleBlur("initial_rate")}
                  className={touched.initial_rate && fieldErrors.initial_rate ? "is-invalid" : ""}
                />
                {touched.initial_rate && fieldErrors.initial_rate ? (
                  <p className="field-error">{fieldErrors.initial_rate}</p>
                ) : null}
              </div>
              <div className="field">
                <label htmlFor="effective_from">Effective from</label>
                <input
                  id="effective_from"
                  name="effective_from"
                  type="date"
                  value={values.effective_from}
                  onChange={(event) => updateField("effective_from", event.target.value)}
                  onBlur={() => handleBlur("effective_from")}
                  className={
                    touched.effective_from && fieldErrors.effective_from ? "is-invalid" : ""
                  }
                />
                {touched.effective_from && fieldErrors.effective_from ? (
                  <p className="field-error">{fieldErrors.effective_from}</p>
                ) : null}
              </div>
            </>
          ) : null}
          <div className="field span-2">
            <label htmlFor="description">Description (optional)</label>
            <textarea
              id="description"
              name="description"
              rows={3}
              maxLength={LIMITS.description.max}
              value={values.description}
              onChange={(event) => updateField("description", event.target.value)}
              onBlur={() => handleBlur("description")}
              className={touched.description && fieldErrors.description ? "is-invalid" : ""}
            />
            <p className="help-text char-count">
              {values.description.length}/{LIMITS.description.max}
            </p>
            {touched.description && fieldErrors.description ? (
              <p className="field-error">{fieldErrors.description}</p>
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
            onClick={() => navigate("/products")}
            disabled={submitting}
          >
            Cancel
          </button>
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? "Saving…" : mode === "create" ? "Create product" : "Save changes"}
          </button>
        </div>
      </form>
    </main>
  );
}
