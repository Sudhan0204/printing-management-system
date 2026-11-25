import api from "./api";

function authHeaders(csrfToken) {
  return {
    "Content-Type": "application/json",
    "X-CSRF-Token": csrfToken,
  };
}

export function fetchBills(params = {}) {
  return api.get("/api/tenant/bills", { params });
}

export function fetchBill(id) {
  return api.get(`/api/tenant/bills/${id}`);
}

export function createBill(payload, csrfToken) {
  return api.post("/api/tenant/bills", payload, {
    headers: authHeaders(csrfToken),
  });
}
