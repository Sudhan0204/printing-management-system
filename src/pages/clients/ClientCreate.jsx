import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ClientForm from "../../components/ClientForm";
import { useAuth } from "../../context/AuthContext";
import { createClient } from "../../services/clients";

export default function ClientCreate() {
  const navigate = useNavigate();
  const { csrfToken } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(formData) {
    setSubmitting(true);

    try {
      const response = await createClient(formData, csrfToken);
      navigate(`/admin/clients/${response.data.client.id}`, {
        replace: true,
        state: { flash: "Client created successfully." },
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="dashboard">
      <section className="panel panel-header-row">
        <div>
          <p className="eyebrow">Clients</p>
          <h2>Create client</h2>
          <p className="muted">Register a printing business and its owner login.</p>
        </div>
      </section>

      <ClientForm
        mode="create"
        submitting={submitting}
        onSubmit={handleSubmit}
        onCancel={() => navigate("/admin/clients")}
      />
    </main>
  );
}
