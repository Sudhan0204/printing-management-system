import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ClientForm, { clientLogoUrl, clientToFormValues } from "../../components/ClientForm";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../services/api";
import { fetchClient, updateClient } from "../../services/clients";

export default function ClientEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { csrfToken, clearSession } = useAuth();

  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  async function handleSubmit(formData) {
    setSubmitting(true);

    try {
      await updateClient(id, formData, csrfToken);
      navigate(`/admin/clients/${id}`, {
        replace: true,
        state: { flash: "Client updated successfully." },
      });
    } finally {
      setSubmitting(false);
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
      </main>
    );
  }

  return (
    <main className="dashboard">
      <section className="panel panel-header-row">
        <div>
          <p className="eyebrow">Clients</p>
          <h2>Edit {client.business_name}</h2>
          <p className="muted">Update business details, branding, and account status.</p>
        </div>
      </section>

      <ClientForm
        mode="edit"
        initialValues={clientToFormValues(client)}
        existingLogoUrl={clientLogoUrl(client)}
        submitting={submitting}
        onSubmit={handleSubmit}
        onCancel={() => navigate(`/admin/clients/${id}`)}
      />
    </main>
  );
}
