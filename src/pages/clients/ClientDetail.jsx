import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import ConfirmDialog from "../../components/ConfirmDialog";
import StatusBadge from "../../components/StatusBadge";
import { clientLogoUrl } from "../../components/ClientForm";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../services/api";
import { fetchClient, updateClientPassword, updateClientStatus } from "../../services/clients";
import {
  LIMITS,
  passwordStrength,
  validateStrongPassword,
} from "../../utils/validate";

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { csrfToken, clearSession } = useAuth();

  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState(location.state?.flash || "");
  const [pendingStatus, setPendingStatus] = useState(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    password: "",
    password_confirmation: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const response = await fetchClient(id);

        if (active) {
          setClient(response.data.client);
        }
      } catch (requestError) {
        if (!active) {
          return;
        }

        if (requestError?.response?.status === 401 || requestError?.response?.status === 403) {
          clearSession();
          navigate("/admin/login", { replace: true });
          return;
        }

        setError(getErrorMessage(requestError, "Could not load client."));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [id, clearSession, navigate]);

  async function confirmStatusChange() {
    if (!pendingStatus || !client) {
      return;
    }

    setStatusBusy(true);

    try {
      const response = await updateClientStatus(client.id, pendingStatus, csrfToken);
      setClient(response.data.client);
      setFlash(
        pendingStatus === "suspended"
          ? "Client suspended successfully."
          : "Client activated successfully."
      );
      setPendingStatus(null);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not update status."));
    } finally {
      setStatusBusy(false);
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setPasswordError("");

    const passwordErrorMessage = validateStrongPassword(
      passwordForm.password,
      passwordForm.password_confirmation
    );
    if (passwordErrorMessage) {
      setPasswordError(passwordErrorMessage);
      return;
    }

    setPasswordBusy(true);

    try {
      await updateClientPassword(
        client.id,
        passwordForm.password,
        passwordForm.password_confirmation,
        csrfToken
      );
      setPasswordForm({ password: "", password_confirmation: "" });
      setFlash("Owner password updated successfully.");
    } catch (requestError) {
      setPasswordError(getErrorMessage(requestError, "Could not update password."));
    } finally {
      setPasswordBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="dashboard">
        <p className="muted">Loading client…</p>
      </main>
    );
  }

  if (!client) {
    return (
      <main className="dashboard">
        <div className="form-banner" role="alert">
          {error || "Client not found."}
        </div>
        <Link to="/admin/clients" className="text-link">
          Back to clients
        </Link>
      </main>
    );
  }

  const logo = clientLogoUrl(client);

  return (
    <main className="dashboard">
      <section className="panel panel-header-row">
        <div className="client-hero">
          {logo ? (
            <img src={logo} alt="" className="detail-logo" />
          ) : (
            <span className="detail-logo placeholder">{client.business_name.slice(0, 1)}</span>
          )}
          <div>
            <p className="eyebrow">Client profile</p>
            <h2>{client.business_name}</h2>
            <StatusBadge status={client.status} />
          </div>
        </div>
        <div className="row-actions">
          <Link to={`/admin/clients/${client.id}/edit`} className="primary-button link-button">
            Edit profile
          </Link>
          {client.status === "active" ? (
            <button
              type="button"
              className="danger-button"
              onClick={() => setPendingStatus("suspended")}
            >
              Suspend
            </button>
          ) : (
            <button
              type="button"
              className="primary-button"
              onClick={() => setPendingStatus("active")}
            >
              Activate
            </button>
          )}
        </div>
      </section>

      {flash ? (
        <div className="success-banner" role="status">
          {flash}
        </div>
      ) : null}

      {error ? (
        <div className="form-banner" role="alert">
          {error}
        </div>
      ) : null}

      <section className="detail-grid">
        <article className="panel">
          <p className="eyebrow">Owner</p>
          <strong>{client.owner_name}</strong>
        </article>
        <article className="panel">
          <p className="eyebrow">Business email</p>
          <strong>{client.email}</strong>
        </article>
        <article className="panel">
          <p className="eyebrow">Login email</p>
          <strong>{client.login_email || "—"}</strong>
        </article>
        <article className="panel">
          <p className="eyebrow">Phone</p>
          <strong>{client.phone}</strong>
        </article>
        <article className="panel span-2">
          <p className="eyebrow">Address</p>
          <strong>
            {client.address}, {client.city}, {client.state} {client.pincode}
          </strong>
        </article>
        <article className="panel">
          <p className="eyebrow">Created</p>
          <strong>{formatDate(client.created_at)}</strong>
        </article>
        <article className="panel">
          <p className="eyebrow">Updated</p>
          <strong>{formatDate(client.updated_at)}</strong>
        </article>
      </section>

      <section className="panel form-section">
        <h3>Reset owner password</h3>
        <p className="muted">Passwords are never displayed. Set a new one securely here.</p>
        <form className="password-reset-form" onSubmit={handlePasswordSubmit}>
          {passwordError ? (
            <div className="form-banner" role="alert">
              {passwordError}
            </div>
          ) : null}
          <div className="form-grid">
            <div className="field">
              <label htmlFor="reset-password">New password</label>
              <div className="password-field">
                <input
                  id="reset-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  maxLength={LIMITS.password.max}
                  value={passwordForm.password}
                  onChange={(event) =>
                    setPasswordForm((current) => ({ ...current, password: event.target.value }))
                  }
                  disabled={passwordBusy}
                  className={passwordError ? "is-invalid" : ""}
                />
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setShowPassword((current) => !current)}
                  disabled={passwordBusy}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {passwordForm.password ? (
                <p
                  className={`help-text strength-${passwordStrength(passwordForm.password).label.toLowerCase()}`}
                >
                  Password strength: {passwordStrength(passwordForm.password).label}
                </p>
              ) : null}
            </div>
            <div className="field">
              <label htmlFor="reset-password-confirm">Confirm password</label>
              <input
                id="reset-password-confirm"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                maxLength={LIMITS.password.max}
                value={passwordForm.password_confirmation}
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    password_confirmation: event.target.value,
                  }))
                }
                disabled={passwordBusy}
                className={passwordError ? "is-invalid" : ""}
              />
            </div>
          </div>
          <button type="submit" className="primary-button" disabled={passwordBusy}>
            {passwordBusy ? "Updating…" : "Update password"}
          </button>
        </form>
      </section>

      <ConfirmDialog
        open={Boolean(pendingStatus)}
        title={pendingStatus === "suspended" ? "Suspend client?" : "Activate client?"}
        message={
          pendingStatus === "suspended"
            ? `${client.business_name} will not be able to sign in until reactivated.`
            : `${client.business_name} will regain access to the business portal.`
        }
        confirmLabel={pendingStatus === "suspended" ? "Suspend" : "Activate"}
        danger={pendingStatus === "suspended"}
        busy={statusBusy}
        onCancel={() => setPendingStatus(null)}
        onConfirm={confirmStatusChange}
      />
    </main>
  );
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}
