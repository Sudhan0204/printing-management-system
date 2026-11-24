import api from "./api";

export function fetchCsrfToken() {
  return api.get("/api/auth/csrf");
}

export function fetchCurrentUser() {
  return api.get("/api/auth/me");
}

export function adminLoginRequest(email, password, csrfToken) {
  return api.post(
    "/api/admin/login",
    { email, password },
    {
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
    }
  );
}

export function tenantLoginRequest(email, password, csrfToken) {
  return api.post(
    "/api/tenant/login",
    { email, password },
    {
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
    }
  );
}

export function logoutRequest(csrfToken) {
  return api.post(
    "/api/auth/logout",
    {},
    {
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
    }
  );
}

export function fetchDashboardSummary() {
  return api.get("/api/admin/dashboard");
}

export function fetchTenantDashboard() {
  return api.get("/api/tenant/dashboard");
}
