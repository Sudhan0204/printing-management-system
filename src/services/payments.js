import api from "./api";

function authHeaders(csrfToken) {
  return {
    "Content-Type": "application/json",
    "X-CSRF-Token": csrfToken,
  };
}

export function fetchPaymentSummary() {
  return api.get("/api/tenant/payments/summary");
}

export function fetchPayments(params = {}) {
  return api.get("/api/tenant/payments", { params });
}

export function fetchPayment(id) {
  return api.get(`/api/tenant/payments/${id}`);
}

export function fetchOutstandingBills(customerId) {
  return api.get("/api/tenant/payments/outstanding-bills", {
    params: { customer_id: customerId },
  });
}

export function createPayment(payload, csrfToken) {
  return api.post("/api/tenant/payments", payload, {
    headers: authHeaders(csrfToken),
  });
}
