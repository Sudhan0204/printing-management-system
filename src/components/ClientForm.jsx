import { useMemo, useState } from "react";
import { assetUrl } from "../services/api";
import {
  LIMITS,
  digitsOnly,
  firstErrorKey,
  focusField,
  mapApiErrors,
  normalizePhone,
  passwordStrength,
  validateEmail,
  validateIndianMobile,
  validateIndianPincode,
  validateLength,
  validateName,
  validateStrongPassword,
} from "../utils/validate";

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
  const [touched, setTouched] = useState({});
  const [formError, setFormError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function validate(nextValues = values) {
    const errors = {};

    const businessError = validateName(
      nextValues.business_name,
      "Business name",
      LIMITS.business_name
    );
    if (businessError) errors.business_name = businessError;

    const ownerError = validateName(nextValues.owner_name, "Owner name", LIMITS.owner_name);
    if (ownerError) errors.owner_name = ownerError;

    const emailError = validateEmail(nextValues.email, true);
    if (emailError) errors.email = emailError;

    const loginError = validateEmail(nextValues.login_email, true);
    if (loginError) errors.login_email = loginError;

    const phoneError = validateIndianMobile(nextValues.phone);
    if (phoneError) errors.phone = phoneError;

    const addressError = validateLength(nextValues.address, {
      min: 1,
      max: LIMITS.address.max,
      label: "Address",
      required: true,
    });
    if (addressError) errors.address = addressError;

    const cityError = validateName(nextValues.city, "City", LIMITS.city);
    if (cityError) errors.city = cityError;

    const stateError = validateName(nextValues.state, "State", LIMITS.state);
    if (stateError) errors.state = stateError;

    const pincodeError = validateIndianPincode(nextValues.pincode);
    if (pincodeError) errors.pincode = pincodeError;

    if (mode === "create" || nextValues.password || nextValues.password_confirmation) {
      const passwordError = validateStrongPassword(
        nextValues.password,
        nextValues.password_confirmation
      );
      if (passwordError) {
        if (passwordError.includes("confirmation")) {
          errors.password_confirmation = passwordError;
        } else {
          errors.password = passwordError;
        }
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

  function handleBlur(field) {
    setTouched((current) => ({ ...current, [field]: true }));
    const message = validate()[field];
    if (message) {
      setFieldErrors((current) => ({ ...current, [field]: message }));
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");

    const errors = validate();
    setFieldErrors(errors);
    setTouched(
      Object.keys(values).reduce((acc, key) => {
        acc[key] = true;
        return acc;
      }, {})
    );

    if (Object.keys(errors).length > 0) {
      focusField(firstErrorKey(errors));
      return;
    }

    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (mode === "edit" && (key === "password" || key === "password_confirmation") && !value) {
        return;
      }

      let nextValue = String(value).trim();
      if (key === "phone") nextValue = normalizePhone(value);
      if (key === "email" || key === "login_email") nextValue = nextValue.toLowerCase();
      if (key === "password" || key === "password_confirmation") nextValue = String(value);
      formData.append(key, nextValue);
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
      const mapped = mapApiErrors(error);
      if (mapped.form) setFormError(mapped.form);
      const { form, ...rest } = mapped;
      setFieldErrors(rest);
      if (firstErrorKey(rest)) focusField(firstErrorKey(rest));
      if (!mapped.form && !Object.keys(rest).length) {
        setFormError(error?.response?.data?.message || "Could not save client.");
      }
    }
  }

  const strength = passwordStrength(values.password);

  function handleLogoChange(event) {
    const file = event.target.files?.[0] || null;
    setLogoFile(file);
    setRemoveLogo(false);
    setFieldErrors((current) => {
      if (!current.logo) return current;
      const next = { ...current };
      delete next.logo;
      return next;
    });
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
            maxLength={LIMITS.business_name.max}
            error={touched.business_name ? fieldErrors.business_name : ""}
            onChange={(value) => updateField("business_name", value)}
            onBlur={() => handleBlur("business_name")}
            disabled={submitting}
            showCount
          />
          <Field
            label="Owner name"
            id="owner_name"
            value={values.owner_name}
            maxLength={LIMITS.owner_name.max}
            error={touched.owner_name ? fieldErrors.owner_name : ""}
            onChange={(value) => updateField("owner_name", value)}
            onBlur={() => handleBlur("owner_name")}
            disabled={submitting}
            showCount
          />
          <Field
            label="Business email"
            id="email"
            type="email"
            value={values.email}
            maxLength={LIMITS.email.max}
            error={touched.email ? fieldErrors.email : ""}
            onChange={(value) => updateField("email", value)}
            onBlur={() => handleBlur("email")}
            disabled={submitting}
          />
          <Field
            label="Phone"
            id="phone"
            value={values.phone}
            maxLength={10}
            inputMode="numeric"
            error={touched.phone ? fieldErrors.phone : ""}
            onChange={(value) => updateField("phone", digitsOnly(value, 10))}
            onBlur={() => handleBlur("phone")}
            disabled={submitting}
            showCount
            help="10-digit Indian mobile"
          />
          <Field
            label="Address"
            id="address"
            value={values.address}
            maxLength={LIMITS.address.max}
            error={touched.address ? fieldErrors.address : ""}
            onChange={(value) => updateField("address", value)}
            onBlur={() => handleBlur("address")}
            disabled={submitting}
            className="span-2"
            showCount
          />
          <Field
            label="City"
            id="city"
            value={values.city}
            maxLength={LIMITS.city.max}
            error={touched.city ? fieldErrors.city : ""}
            onChange={(value) => updateField("city", value)}
            onBlur={() => handleBlur("city")}
            disabled={submitting}
            showCount
          />
          <Field
            label="State"
            id="state"
            value={values.state}
            maxLength={LIMITS.state.max}
            error={touched.state ? fieldErrors.state : ""}
            onChange={(value) => updateField("state", value)}
            onBlur={() => handleBlur("state")}
            disabled={submitting}
            showCount
          />
          <Field
            label="Pincode"
            id="pincode"
            value={values.pincode}
            maxLength={6}
            inputMode="numeric"
            error={touched.pincode ? fieldErrors.pincode : ""}
            onChange={(value) => updateField("pincode", digitsOnly(value, 6))}
            onBlur={() => handleBlur("pincode")}
            disabled={submitting}
            showCount
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
            maxLength={LIMITS.email.max}
            error={touched.login_email ? fieldErrors.login_email : ""}
            onChange={(value) => updateField("login_email", value)}
            onBlur={() => handleBlur("login_email")}
            disabled={submitting}
          />
          <div />
          <div className="field">
            <label htmlFor="password">
              {mode === "edit" ? "New password (optional)" : "Password"}
            </label>
            <div className="password-field">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={values.password}
                maxLength={LIMITS.password.max}
                onChange={(event) => updateField("password", event.target.value)}
                onBlur={() => handleBlur("password")}
                disabled={submitting}
                autoComplete="new-password"
                className={touched.password && fieldErrors.password ? "is-invalid" : ""}
              />
              <button
                type="button"
                className="ghost-button"
                onClick={() => setShowPassword((current) => !current)}
                disabled={submitting}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {values.password ? (
              <p className={`help-text strength-${strength.label.toLowerCase()}`}>
                Password strength: {strength.label}
              </p>
            ) : null}
            {touched.password && fieldErrors.password ? (
              <p className="field-error">{fieldErrors.password}</p>
            ) : null}
          </div>
          <Field
            label="Confirm password"
            id="password_confirmation"
            type={showPassword ? "text" : "password"}
            value={values.password_confirmation}
            maxLength={LIMITS.password.max}
            error={touched.password_confirmation ? fieldErrors.password_confirmation : ""}
            onChange={(value) => updateField("password_confirmation", value)}
            onBlur={() => handleBlur("password_confirmation")}
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
  onBlur,
  error,
  disabled,
  type = "text",
  className = "",
  autoComplete,
  maxLength,
  inputMode,
  showCount = false,
  help,
}) {
  return (
    <div className={`field ${className}`.trim()}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        maxLength={maxLength}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        autoComplete={autoComplete}
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
