import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../services/api";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function TenantLogin() {
  const navigate = useNavigate();
  const { loginAsTenant, csrfToken } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const errors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      errors.email = "Email is required.";
    } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
      errors.email = "Enter a valid email address.";
    }

    if (!password) {
      errors.password = "Password is required.";
    } else if (password.length < 8) {
      errors.password = "Password must be at least 8 characters.";
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
      await loginAsTenant(email.trim(), password);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error, "Unable to sign in. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page tenant-login-page">
      <section className="login-card">
        <p className="eyebrow">Business portal</p>
        <h1>Sign in to your press</h1>
        <p className="lede">
          Access your printing business dashboard with the account provided by your platform admin.
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

          <label htmlFor="tenant-email">Email</label>
          <input
            id="tenant-email"
            name="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={fieldErrors.email ? "true" : "false"}
            disabled={submitting}
          />
          {fieldErrors.email ? <p className="field-error">{fieldErrors.email}</p> : null}

          <label htmlFor="tenant-password">Password</label>
          <div className="password-field">
            <input
              id="tenant-password"
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
