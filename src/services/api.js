import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    "http://localhost/printing-management-system/backend/public",
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

export function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || fallback;
}

export default api;
