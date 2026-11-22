import api from "./api";

export function fetchCsrfToken() {
  return api.get("/api/auth/csrf");
}

export function fetchCurrentUser() {
  return api.get("/api/auth/me");
}

export function loginRequest(email, password, csrfToken) {
  return api.post(
    "/api/auth/login",
    { email, password },
    {
      headers: {
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
        "X-CSRF-Token": csrfToken,
      },
    }
  );
}

export function fetchDashboardSummary() {
  return api.get("/api/dashboard/summary");
}
