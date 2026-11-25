import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../services/api";
import { LIMITS, validateEmail } from "../../utils/validate";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { loginAsAdmin, csrfToken } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const errors = {};
    const emailError = validateEmail(email, true);
    if (emailError) errors.email = emailError;

    if (!password) {
      errors.password = "Password is required.";
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

    setSubmitting(true);

    try {
      await loginAsAdmin(email.trim(), password);
      navigate("/admin/dashboard", { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error, "Unable to sign in. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page admin-login-page">
      <section className="login-card">
        <p className="eyebrow">PrintDesk Platform</p>
        <h1>Super Admin sign in</h1>
        <p className="lede">
          Manage printing businesses, activate accounts, and oversee the platform.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          {!csrfToken ? (
            <div className="form-banner" role="alert">
              Could not start a secure session. Check that Apache and the PHP API are running, then refresh this page.
            </div>
          ) : null}

          {formError ? (
            <div className="form-banner" role="alert">
              {formError}
            </div>
          ) : null}

          <label htmlFor="admin-email">Email</label>
          <input
            id="admin-email"
            name="email"
            type="email"
            autoComplete="username"
            maxLength={LIMITS.email.max}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={fieldErrors.email ? "true" : "false"}
            className={fieldErrors.email ? "is-invalid" : ""}
            disabled={submitting}
          />
          {fieldErrors.email ? <p className="field-error">{fieldErrors.email}</p> : null}

          <label htmlFor="admin-password">Password</label>
          <div className="password-field">
            <input
              id="admin-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={fieldErrors.password ? "true" : "false"}
              disabled={submitting}
            />
            <button
              type="button"
              className="ghost-button"
              onClick={() => setShowPassword((current) => !current)}
              aria-pressed={showPassword}
              disabled={submitting}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {fieldErrors.password ? <p className="field-error">{fieldErrors.password}</p> : null}

          <button type="submit" className="primary-button" disabled={submitting || !csrfToken}>
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
