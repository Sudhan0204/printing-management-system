import { useMemo, useState } from "react";
import { assetUrl } from "../services/api";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+\-]{7,20}$/;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const EMPTY = {
  business_name: "",
  owner_name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  login_email: "",
  password: "",
  password_confirmation: "",
  status: "active",
};

export default function ClientForm({
  initialValues,
  existingLogoUrl,
  mode = "create",
  submitting,
  onSubmit,
  onCancel,
}) {
  const [values, setValues] = useState({ ...EMPTY, ...initialValues });
  const [logoFile, setLogoFile] = useState(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");

  const previewUrl = useMemo(() => {
    if (logoFile) {
      return URL.createObjectURL(logoFile);
    }

    if (removeLogo) {
      return null;
    }

    return existingLogoUrl || null;
  }, [logoFile, removeLogo, existingLogoUrl]);

  function updateField(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function validate() {
    const errors = {};
    const required = [
      "business_name",
      "owner_name",
      "email",
      "phone",
      "address",
      "city",
      "state",
      "pincode",
      "login_email",
    ];

    required.forEach((field) => {
      if (!String(values[field] || "").trim()) {
        errors[field] = "This field is required.";
      }
    });

    if (values.email && !EMAIL_PATTERN.test(values.email.trim())) {
      errors.email = "Enter a valid email.";
    }

    if (values.login_email && !EMAIL_PATTERN.test(values.login_email.trim())) {
      errors.login_email = "Enter a valid login email.";
    }

    if (values.phone && !PHONE_PATTERN.test(values.phone.replace(/\s+/g, ""))) {
      errors.phone = "Enter a valid phone number.";
    }

    if (mode === "create" || values.password || values.password_confirmation) {
      if (!values.password) {
        errors.password = "Password is required.";
      } else if (values.password.length < 8) {
        errors.password = "Password must be at least 8 characters.";
      } else if (!/[A-Za-z]/.test(values.password) || !/[0-9]/.test(values.password)) {
        errors.password = "Use at least one letter and one number.";
      }

      if (values.password !== values.password_confirmation) {
        errors.password_confirmation = "Passwords do not match.";
      }
    }

    if (logoFile) {
      if (!ALLOWED_TYPES.includes(logoFile.type)) {
        errors.logo = "Logo must be JPG, PNG, or WebP.";
      } else if (logoFile.size > 2 * 1024 * 1024) {
        errors.logo = "Logo must be 2 MB or smaller.";
      }
    }

    return errors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");

    const errors = validate();
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (mode === "edit" && (key === "password" || key === "password_confirmation") && !value) {
        return;
      }

      formData.append(key, String(value).trim());
    });

    if (logoFile) {
      formData.append("logo", logoFile);
    }

    if (removeLogo && !logoFile) {
      formData.append("remove_logo", "1");
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      setFormError(error?.response?.data?.message || "Could not save client.");
    }
  }

  function handleLogoChange(event) {
    const file = event.target.files?.[0] || null;
    setLogoFile(file);
    setRemoveLogo(false);
  }

  return (
    <form className="client-form" onSubmit={handleSubmit} noValidate>
      {formError ? (
        <div className="form-banner" role="alert">
          {formError}
        </div>
      ) : null}

      <section className="panel form-section">
        <h3>Business information</h3>
        <div className="form-grid">
          <Field
            label="Business name"
            id="business_name"
            value={values.business_name}
            error={fieldErrors.business_name}
            onChange={(value) => updateField("business_name", value)}
            disabled={submitting}
          />
          <Field
            label="Owner name"
            id="owner_name"
            value={values.owner_name}
            error={fieldErrors.owner_name}
            onChange={(value) => updateField("owner_name", value)}
            disabled={submitting}
          />
          <Field
            label="Business email"
            id="email"
            type="email"
            value={values.email}
            error={fieldErrors.email}
            onChange={(value) => updateField("email", value)}
            disabled={submitting}
          />
          <Field
            label="Phone"
            id="phone"
            value={values.phone}
            error={fieldErrors.phone}
            onChange={(value) => updateField("phone", value)}
            disabled={submitting}
          />
          <Field
            label="Address"
            id="address"
            value={values.address}
            error={fieldErrors.address}
            onChange={(value) => updateField("address", value)}
            disabled={submitting}
            className="span-2"
          />
          <Field
            label="City"
            id="city"
            value={values.city}
            error={fieldErrors.city}
            onChange={(value) => updateField("city", value)}
            disabled={submitting}
          />
          <Field
            label="State"
            id="state"
            value={values.state}
            error={fieldErrors.state}
            onChange={(value) => updateField("state", value)}
            disabled={submitting}
          />
          <Field
            label="Pincode"
            id="pincode"
            value={values.pincode}
            error={fieldErrors.pincode}
            onChange={(value) => updateField("pincode", value)}
            disabled={submitting}
          />
        </div>
      </section>

      <section className="panel form-section">
        <h3>Account information</h3>
        <div className="form-grid">
          <Field
            label="Login email"
            id="login_email"
            type="email"
            value={values.login_email}
            error={fieldErrors.login_email}
            onChange={(value) => updateField("login_email", value)}
            disabled={submitting}
          />
          <div />
          <Field
            label={mode === "edit" ? "New password (optional)" : "Password"}
            id="password"
            type="password"
            value={values.password}
            error={fieldErrors.password}
            onChange={(value) => updateField("password", value)}
            disabled={submitting}
            autoComplete="new-password"
          />
          <Field
            label="Confirm password"
            id="password_confirmation"
            type="password"
            value={values.password_confirmation}
            error={fieldErrors.password_confirmation}
            onChange={(value) => updateField("password_confirmation", value)}
            disabled={submitting}
            autoComplete="new-password"
          />
        </div>
      </section>

      <section className="panel form-section">
        <h3>Business branding</h3>
        <div className="logo-uploader">
          <div className="logo-preview">
            {previewUrl ? (
              <img src={previewUrl} alt="Logo preview" />
            ) : (
              <span>No logo</span>
            )}
          </div>
          <div className="logo-actions">
            <label className="ghost-button file-button">
              {previewUrl ? "Change logo" : "Upload logo"}
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={handleLogoChange}
                disabled={submitting}
                hidden
              />
            </label>
            {previewUrl ? (
              <button
                type="button"
                className="ghost-button"
                disabled={submitting}
                onClick={() => {
                  setLogoFile(null);
                  setRemoveLogo(true);
                }}
              >
                Remove logo
              </button>
            ) : null}
            {fieldErrors.logo ? <p className="field-error">{fieldErrors.logo}</p> : null}
            <p className="help-text">JPG, PNG, or WebP. Max 2 MB.</p>
          </div>
        </div>
      </section>

      <section className="panel form-section">
        <h3>Account status</h3>
        <div className="status-options">
          <label className="choice">
            <input
              type="radio"
              name="status"
              value="active"
              checked={values.status === "active"}
              onChange={() => updateField("status", "active")}
              disabled={submitting}
            />
            Active
          </label>
          <label className="choice">
            <input
              type="radio"
              name="status"
              value="suspended"
              checked={values.status === "suspended"}
              onChange={() => updateField("status", "suspended")}
              disabled={submitting}
            />
            Suspended
          </label>
        </div>
      </section>

      <div className="form-actions">
        <button type="button" className="ghost-button" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="primary-button" disabled={submitting}>
          {submitting ? "Saving…" : mode === "create" ? "Create client" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  id,
  value,
  onChange,
  error,
  disabled,
  type = "text",
  className = "",
  autoComplete,
}) {
  return (
    <div className={`field ${className}`.trim()}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        autoComplete={autoComplete}
        aria-invalid={error ? "true" : "false"}
      />
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}

export function clientToFormValues(client) {
  return {
    business_name: client.business_name || "",
    owner_name: client.owner_name || "",
    email: client.email || "",
    phone: client.phone || "",
    address: client.address || "",
    city: client.city || "",
    state: client.state || "",
    pincode: client.pincode || "",
    login_email: client.login_email || client.email || "",
    password: "",
    password_confirmation: "",
    status: client.status || "active",
  };
}

export function clientLogoUrl(client) {
  return client?.logo_url || assetUrl(client?.logo);
}
