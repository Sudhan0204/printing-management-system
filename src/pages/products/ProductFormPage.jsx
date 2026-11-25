import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../services/api";
import { createProduct, fetchProduct, updateProduct } from "../../services/products";
import { PRICING_TYPES, UNITS } from "../../utils/billingCalc";

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

  function validate() {
    const errors = {};
    if (!values.product_name.trim()) errors.product_name = "Product name is required.";
    if (mode === "create") {
      if (values.initial_rate === "" || Number(values.initial_rate) < 0) {
        errors.initial_rate = "Enter a valid initial rate.";
      }
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
      setError(getErrorMessage(requestError, "Could not save product."));
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
              value={values.product_name}
              onChange={(event) =>
                setValues((current) => ({ ...current, product_name: event.target.value }))
              }
            />
            {fieldErrors.product_name ? (
              <p className="field-error">{fieldErrors.product_name}</p>
            ) : null}
          </div>
          <div className="field">
            <label htmlFor="category">Category (optional)</label>
            <input
              id="category"
              value={values.category}
              onChange={(event) =>
                setValues((current) => ({ ...current, category: event.target.value }))
              }
            />
          </div>
          <div className="field">
            <label htmlFor="unit">Unit</label>
            <select
              id="unit"
              value={values.unit}
              onChange={(event) =>
                setValues((current) => ({ ...current, unit: event.target.value }))
              }
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
              value={values.pricing_type}
              onChange={(event) =>
                setValues((current) => ({ ...current, pricing_type: event.target.value }))
              }
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
                  type="number"
                  min="0"
                  step="0.01"
                  value={values.initial_rate}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, initial_rate: event.target.value }))
                  }
                />
                {fieldErrors.initial_rate ? (
                  <p className="field-error">{fieldErrors.initial_rate}</p>
                ) : null}
              </div>
              <div className="field">
                <label htmlFor="effective_from">Effective from</label>
                <input
                  id="effective_from"
                  type="date"
                  value={values.effective_from}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, effective_from: event.target.value }))
                  }
                />
              </div>
            </>
          ) : null}
          <div className="field span-2">
            <label htmlFor="description">Description (optional)</label>
            <textarea
              id="description"
              rows={3}
              value={values.description}
              onChange={(event) =>
                setValues((current) => ({ ...current, description: event.target.value }))
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
