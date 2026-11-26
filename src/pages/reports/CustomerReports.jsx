import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import StatusBadge from "../../components/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../services/api";
import { exportCustomerReport, fetchCustomerReport } from "../../services/reports";
import { formatMoney } from "../../utils/billingCalc";
import { digitsOnly } from "../../utils/validate";

const DATE_PRESETS = [
  { value: "", label: "All dates" },
  { value: "today", label: "Today" },
  { value: "this_week", label: "This week" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "custom", label: "Custom range" },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "paid", label: "Paid" },
  { value: "partially_paid", label: "Partially Paid" },
  { value: "unpaid", label: "Unpaid" },
];

export default function CustomerReports() {
  const navigate = useNavigate();
  const { csrfToken, clearSession } = useAuth();

  const [searchName, setSearchName] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [datePreset, setDatePreset] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const [customers, setCustomers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filtersMeta, setFiltersMeta] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0 });
  // Persist selected customers across search/filter reloads (id -> snapshot).
  const [selectedCustomers, setSelectedCustomers] = useState({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState("");
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");

  const selectedIds = useMemo(
    () => new Set(Object.keys(selectedCustomers).map((id) => Number(id))),
    [selectedCustomers]
  );
  const selectedList = useMemo(
    () => Object.values(selectedCustomers).sort((a, b) => a.customer_name.localeCompare(b.customer_name)),
    [selectedCustomers]
  );

  const filterParams = useMemo(
    () => ({
      search_name: searchName.trim() || undefined,
      search_phone: searchPhone.trim() || undefined,
      search_email: searchEmail.trim().toLowerCase() || undefined,
      status: status || undefined,
      payment_status: paymentStatus || undefined,
      date_preset: datePreset || undefined,
      date_from: datePreset === "custom" ? dateFrom || undefined : undefined,
      date_to: datePreset === "custom" ? dateTo || undefined : undefined,
      page,
      per_page: 25,
    }),
    [searchName, searchPhone, searchEmail, status, paymentStatus, datePreset, dateFrom, dateTo, page]
  );

  useEffect(() => {
    let active = true;

    async function load() {
      if (datePreset === "custom" && (!dateFrom || !dateTo)) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const response = await fetchCustomerReport(filterParams);
        if (!active) return;
        setCustomers(response.data.customers || []);
        setSummary(response.data.summary || null);
        setFiltersMeta(response.data.filters || null);
        setPagination(response.data.pagination || { page: 1, total_pages: 1, total: 0 });
        // Do NOT clear selectedCustomers here — selections persist across search/filters.
      } catch (requestError) {
        if (!active) return;
        if (requestError?.response?.status === 401 || requestError?.response?.status === 403) {
          clearSession();
          navigate("/login", { replace: true });
          return;
        }
        setError(getErrorMessage(requestError, "Could not load customer report."));
      } finally {
        if (active) setLoading(false);
      }
    }

    const timer = setTimeout(
      load,
      searchName || searchPhone || searchEmail ? 250 : 0
    );
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    filterParams,
    clearSession,
    navigate,
    datePreset,
    dateFrom,
    dateTo,
    searchName,
    searchPhone,
    searchEmail,
  ]);

  const pageIds = customers.map((item) => item.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const selectedCount = selectedIds.size;

  function rememberCustomer(customer) {
    return {
      id: customer.id,
      customer_name: customer.customer_name,
      phone: customer.phone || "",
    };
  }

  function toggleOne(customer) {
    setSelectedCustomers((current) => {
      const next = { ...current };
      if (next[customer.id]) {
        delete next[customer.id];
      } else {
        next[customer.id] = rememberCustomer(customer);
      }
      return next;
    });
  }

  function removeSelected(id) {
    setSelectedCustomers((current) => {
      if (!current[id]) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  function toggleAllPage() {
    setSelectedCustomers((current) => {
      const next = { ...current };
      if (allPageSelected) {
        pageIds.forEach((id) => {
          delete next[id];
        });
      } else {
        customers.forEach((customer) => {
          next[customer.id] = rememberCustomer(customer);
        });
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedCustomers({});
  }

  function resetFilters() {
    setSearchName("");
    setSearchPhone("");
    setSearchEmail("");
    setStatus("");
    setPaymentStatus("");
    setDatePreset("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  function exportFilters() {
    return {
      search_name: searchName.trim(),
      search_phone: searchPhone.trim(),
      search_email: searchEmail.trim().toLowerCase(),
      status,
      payment_status: paymentStatus,
      date_preset: datePreset,
      date_from: datePreset === "custom" ? dateFrom : "",
      date_to: datePreset === "custom" ? dateTo : "",
    };
  }

  async function handleExport(mode, overrideIds = null) {
    if (exporting) return;
    setError("");
    setFlash("");
    setExporting(mode);

    try {
      const selected = overrideIds || Array.from(selectedIds);
      const payload = {
        mode,
        customer_ids: mode === "selected" ? selected : [],
        filters: exportFilters(),
      };
      const result = await exportCustomerReport(payload, csrfToken);
      setFlash(`Excel downloaded: ${result.filename}`);
    } catch (requestError) {
      if (requestError?.response?.data instanceof Blob) {
        try {
          const text = await requestError.response.data.text();
          const json = JSON.parse(text);
          setError(json.message || "Export failed.");
        } catch {
          setError("Export failed.");
        }
      } else {
        setError(getErrorMessage(requestError, "Could not export Excel file."));
      }
    } finally {
      setExporting("");
    }
  }

  const cards = [
    { label: "Total Customers", value: summary?.total_customers, raw: true, tone: "neutral" },
    { label: "Total Bills", value: summary?.total_bills, raw: true, tone: "neutral" },
    { label: "Total Billed", value: summary?.total_billed, tone: "billed" },
    { label: "Payments Received", value: summary?.total_received, tone: "paid" },
    { label: "Outstanding Balance", value: summary?.total_outstanding, tone: "due" },
  ];

  return (
    <main className="dashboard reports-workspace">
      <section className="panel report-hero">
        <div>
          <p className="eyebrow">Reports</p>
          <h2>Customer Reports</h2>
          <p className="muted report-hero-copy">
            Generate, filter and export detailed customer billing and payment records.
          </p>
        </div>
        <div className="report-hero-meta">
          <span className="report-pill">Excel workbook · 6 sheets</span>
          <span className="report-pill muted-pill">
            {filtersMeta?.filter_label || "All dates"}
          </span>
        </div>
      </section>

      {flash ? (
        <div className="success-banner" role="status">
          {flash}
        </div>
      ) : null}
      {error ? (
        <div className="form-banner" role="alert">
          {error}
        </div>
      ) : null}

      <section className="stat-grid report-stats report-stats-premium">
        {cards.map((card) => (
          <article key={card.label} className={`stat-card report-stat report-stat-${card.tone}`}>
            <p>{card.label}</p>
            <strong>
              {loading
                ? "…"
                : card.raw
                  ? card.value ?? 0
                  : formatMoney(card.value ?? 0)}
            </strong>
          </article>
        ))}
      </section>

      <section className="reports-main">
          <section className="panel report-filters-panel">
            <div className="report-section-head">
              <div>
                <h3>Find customers</h3>
                <p className="muted">Search and filter the customer list before exporting.</p>
              </div>
              <button type="button" className="ghost-button" onClick={resetFilters}>
                Reset filters
              </button>
            </div>

            <div className="report-filters">
              <label className="report-field">
                <span>Customer name</span>
                <input
                  type="search"
                  placeholder="Search by name"
                  value={searchName}
                  maxLength={100}
                  onChange={(event) => {
                    setPage(1);
                    setSearchName(event.target.value);
                  }}
                />
              </label>
              <label className="report-field">
                <span>Phone</span>
                <input
                  type="search"
                  inputMode="numeric"
                  placeholder="10-digit mobile"
                  value={searchPhone}
                  maxLength={10}
                  onChange={(event) => {
                    setPage(1);
                    setSearchPhone(digitsOnly(event.target.value, 10));
                  }}
                />
              </label>
              <label className="report-field">
                <span>Email</span>
                <input
                  type="search"
                  placeholder="Search by email"
                  value={searchEmail}
                  maxLength={254}
                  onChange={(event) => {
                    setPage(1);
                    setSearchEmail(event.target.value);
                  }}
                />
              </label>
              <label className="report-field">
                <span>Status</span>
                <select
                  value={status}
                  onChange={(event) => {
                    setPage(1);
                    setStatus(event.target.value);
                  }}
                >
                  <option value="">All statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <label className="report-field">
                <span>Payment Status</span>
                <select
                  value={paymentStatus}
                  onChange={(event) => {
                    setPage(1);
                    setPaymentStatus(event.target.value);
                  }}
                >
                  {PAYMENT_STATUS_OPTIONS.map((item) => (
                    <option key={item.value || "all"} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="report-field">
                <span>Date range</span>
                <select
                  value={datePreset}
                  onChange={(event) => {
                    setPage(1);
                    setDatePreset(event.target.value);
                  }}
                >
                  {DATE_PRESETS.map((item) => (
                    <option key={item.value || "all"} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              {datePreset === "custom" ? (
                <>
                  <label className="report-field">
                    <span>From</span>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(event) => {
                        setPage(1);
                        setDateFrom(event.target.value);
                      }}
                    />
                  </label>
                  <label className="report-field">
                    <span>To</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(event) => {
                        setPage(1);
                        setDateTo(event.target.value);
                      }}
                    />
                  </label>
                </>
              ) : null}
            </div>
            <p className="help-text">
              Bills use bill date. Payments use payment date. Outstanding uses bill balances in that
              bill-date range. Payment Status classifies customers from bills in the same date scope.
            </p>
          </section>

          <section className="panel report-export-toolbar">
            <div className="report-selection">
              <strong>{selectedCount}</strong>
              <span className="muted">selected · {pagination.total || 0} matching</span>
            </div>
            <div className="report-inline-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={toggleAllPage}
                disabled={!customers.length}
              >
                {allPageSelected ? "Unselect page" : "Select all"}
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={clearSelection}
                disabled={!selectedCount}
              >
                Clear selection
              </button>
            </div>
            <div className="report-export-actions-inline">
              <button
                type="button"
                className="primary-button"
                disabled={!selectedCount || Boolean(exporting)}
                onClick={() => handleExport("selected")}
              >
                {exporting === "selected" ? "Exporting…" : "Export Selected"}
              </button>
              <button
                type="button"
                className="ghost-button"
                disabled={Boolean(exporting)}
                onClick={() => handleExport("filtered")}
              >
                {exporting === "filtered" ? "Exporting…" : "Export Filtered"}
              </button>
              <button
                type="button"
                className="ghost-button"
                disabled={Boolean(exporting)}
                onClick={() => handleExport("all")}
              >
                {exporting === "all" ? "Exporting…" : "Export All"}
              </button>
            </div>
            {exporting ? (
              <p className="help-text export-progress">Preparing Excel workbook…</p>
            ) : null}
            {selectedList.length > 0 ? (
              <div className="report-selected-chips" aria-label="Selected customers">
                {selectedList.map((customer) => (
                  <span key={customer.id} className="report-selected-chip">
                    <span>
                      {customer.customer_name}
                      {customer.phone ? ` · ${customer.phone}` : ""}
                    </span>
                    <button
                      type="button"
                      className="report-chip-remove"
                      onClick={() => removeSelected(customer.id)}
                      aria-label={`Remove ${customer.customer_name}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </section>

          <section className="panel table-panel report-table-panel">
            <div className="report-section-head">
              <div>
                <h3>Customer list</h3>
                <p className="muted">Select customers and export from the toolbar above.</p>
              </div>
            </div>

            <div className="table-wrap">
              <table className="data-table report-table">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        onChange={toggleAllPage}
                        aria-label="Select all on page"
                        disabled={!customers.length}
                      />
                    </th>
                    <th>Customer Name</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Total Bills</th>
                    <th>Total Billed</th>
                    <th>Total Paid</th>
                    <th>Outstanding</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id} className={selectedIds.has(customer.id) ? "is-selected" : ""}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(customer.id)}
                          onChange={() => toggleOne(customer)}
                          aria-label={`Select ${customer.customer_name}`}
                        />
                      </td>
                      <td>
                        <div className="report-customer-cell">
                          <strong>{customer.customer_name}</strong>
                          <StatusBadge status={customer.status} />
                        </div>
                      </td>
                      <td>{customer.phone}</td>
                      <td>{customer.email || "—"}</td>
                      <td>{customer.total_bills}</td>
                      <td>{formatMoney(customer.total_billed)}</td>
                      <td className="is-paid">{formatMoney(customer.total_paid)}</td>
                      <td className={customer.outstanding_balance > 0 ? "is-outstanding" : ""}>
                        {formatMoney(customer.outstanding_balance)}
                      </td>
                      <td>
                        <div className="report-row-actions">
                          <Link to={`/customers/${customer.id}`} className="text-link">
                            View
                          </Link>
                          <button
                            type="button"
                            className="text-link"
                            disabled={Boolean(exporting)}
                            onClick={() => handleExport("selected", [customer.id])}
                          >
                            Export
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {loading ? <p className="muted">Loading customers…</p> : null}
            {!loading && customers.length === 0 ? (
              <p className="muted empty-state">No customers match the current filters.</p>
            ) : null}

            {pagination.total_pages > 1 ? (
              <div className="pagination-row">
                <button
                  type="button"
                  className="ghost-button"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </button>
                <span className="muted">
                  Page {pagination.page} of {pagination.total_pages}
                </span>
                <button
                  type="button"
                  className="ghost-button"
                  disabled={page >= pagination.total_pages || loading}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </button>
              </div>
            ) : null}
          </section>
      </section>
    </main>
  );
}
