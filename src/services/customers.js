import api from "./api";

function authHeaders(csrfToken) {
  return {
    "Content-Type": "application/json",
    "X-CSRF-Token": csrfToken,
  };
}

export function fetchCustomers(params = {}) {
  return api.get("/api/tenant/customers", { params });
}

export function fetchCustomer(id) {
  return api.get(`/api/tenant/customers/${id}`);
}

export function createCustomer(payload, csrfToken) {
  return api.post("/api/tenant/customers", payload, {
    headers: authHeaders(csrfToken),
  });
}

export function updateCustomer(id, payload, csrfToken) {
  return api.put(`/api/tenant/customers/${id}`, payload, {
    headers: authHeaders(csrfToken),
  });
}

export function updateCustomerStatus(id, status, csrfToken) {
  return api.post(
    `/api/tenant/customers/${id}/status`,
    { status },
    { headers: authHeaders(csrfToken) }
  );
}
