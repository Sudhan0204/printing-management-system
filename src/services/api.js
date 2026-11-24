import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "http://localhost/printing-management-system/backend/public",
  withCredentials: true,
  headers: {
    Accept: "application/json",
  },
});

export function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || fallback;
}

export function assetUrl(path) {
  if (!path) {
    return null;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const base = (api.defaults.baseURL || "").replace(/\/$/, "");
  return `${base}/${String(path).replace(/^\//, "")}`;
}

export default api;
