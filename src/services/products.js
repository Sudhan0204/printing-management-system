import api from "./api";

function authHeaders(csrfToken) {
  return {
    "Content-Type": "application/json",
    "X-CSRF-Token": csrfToken,
  };
}

export function fetchProducts(params = {}) {
  return api.get("/api/tenant/products", { params });
}

export function fetchProduct(id) {
  return api.get(`/api/tenant/products/${id}`);
}

export function createProduct(payload, csrfToken) {
  return api.post("/api/tenant/products", payload, {
    headers: authHeaders(csrfToken),
  });
}

export function updateProduct(id, payload, csrfToken) {
  return api.put(`/api/tenant/products/${id}`, payload, {
    headers: authHeaders(csrfToken),
  });
}

export function updateProductStatus(id, status, csrfToken) {
  return api.post(
    `/api/tenant/products/${id}/status`,
    { status },
    { headers: authHeaders(csrfToken) }
  );
}

export function fetchProductRates(id) {
  return api.get(`/api/tenant/products/${id}/rates`);
}

export function createProductRate(id, payload, csrfToken) {
  return api.post(`/api/tenant/products/${id}/rates`, payload, {
    headers: authHeaders(csrfToken),
  });
}
