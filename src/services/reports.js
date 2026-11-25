import api from "./api";

function authHeaders(csrfToken) {
  return {
    "Content-Type": "application/json",
    "X-CSRF-Token": csrfToken,
  };
}

export function fetchReportHub() {
  return api.get("/api/tenant/reports");
}

export function fetchCustomerReport(params = {}) {
  return api.get("/api/tenant/reports/customers", { params });
}

export function fetchCustomerReportDetail(id, params = {}) {
  return api.get(`/api/tenant/reports/customers/${id}`, { params });
}

export async function exportCustomerReport(payload, csrfToken) {
  const response = await api.post("/api/tenant/reports/customers/export", payload, {
    headers: authHeaders(csrfToken),
    responseType: "blob",
  });

  const contentType = response.headers["content-type"] || "";

  if (contentType.includes("application/json")) {
    const text = await response.data.text();
    const json = JSON.parse(text);
    const error = new Error(json.message || "Export failed");
    error.response = { data: json, status: 422 };
    throw error;
  }

  const disposition = response.headers["content-disposition"] || "";
  const match = /filename="?([^"]+)"?/i.exec(disposition);
  const filename = match?.[1] || `Customer_Report_${Date.now()}.xlsx`;

  const blob = new Blob([response.data], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);

  return { filename };
}
