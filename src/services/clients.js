import api from "./api";

export function fetchClients({ search = "", status = "", page = 1, perPage = 10 } = {}) {
  return api.get("/api/admin/clients", {
    params: {
      search: search || undefined,
      status: status || undefined,
      page,
      per_page: perPage,
    },
  });
}

export function fetchClient(id) {
  return api.get(`/api/admin/clients/${id}`);
}

export function createClient(formData, csrfToken) {
  return api.post("/api/admin/clients", formData, {
    headers: {
      "X-CSRF-Token": csrfToken,
    },
  });
}

export function updateClient(id, formData, csrfToken) {
  return api.post(`/api/admin/clients/${id}`, formData, {
    headers: {
      "X-CSRF-Token": csrfToken,
    },
  });
}

export function updateClientStatus(id, status, csrfToken) {
  return api.post(
    `/api/admin/clients/${id}/status`,
    { status },
    {
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
    }
  );
}

export function updateClientPassword(id, password, passwordConfirmation, csrfToken) {
  return api.post(
    `/api/admin/clients/${id}/password`,
    {
      password,
      password_confirmation: passwordConfirmation,
    },
    {
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
    }
  );
}
