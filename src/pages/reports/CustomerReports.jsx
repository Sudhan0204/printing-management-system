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

export default function CustomerReports() {
  const navigate = useNavigate();
  const { csrfToken, clearSession } = useAuth();

  const [searchName, setSearchName] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [status, setStatus] = useState("");
  const [datePreset, setDatePreset] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const [customers, setCustomers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filtersMeta, setFiltersMeta] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0 });
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState("");
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");

  const filterParams = useMemo(
    () => ({
      search_name: searchName.trim() || undefined,
      search_phone: searchPhone.trim() || undefined,
      status: status || undefined,
      date_preset: datePreset || undefined,
      date_from: datePreset === "custom" ? dateFrom || undefined : undefined,
      date_to: datePreset === "custom" ? dateTo || undefined : undefined,
      page,
      per_page: 25,
    }),
    [searchName, searchPhone, status, datePreset, dateFrom, dateTo, page]
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
        setSelectedIds(new Set());
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

    const timer = setTimeout(load, searchName || searchPhone ? 250 : 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [filterParams, clearSession, navigate, datePreset, dateFrom, dateTo, searchName, searchPhone]);

  const pageIds = customers.map((item) => item.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const selectedCount = selectedIds.size;

  function toggleOne(id) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllPage() {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function exportFilters() {
    return {
      search_name: searchName.trim(),
      search_phone: searchPhone.trim(),
      status,
      date_preset: datePreset,
      date_from: datePreset === "custom" ? dateFrom : "",
      date_to: datePreset === "custom" ? dateTo : "",
    };
  }

  async function handleExport(mode) {
    setError("");
    setFlash("");
    setExporting(mode);

    try {
      const payload = {
        mode,
        customer_ids: mode === "selected" ? Array.from(selectedIds) : [],
        filters: exportFilters(),
      };
      const result = await exportCustomerReport(payload, csrfToken);
      setFlash(`Downloaded ${result.filename}`);
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
    { label: "Total customers", value: summary?.total_customers, raw: true },
    { label: "Total billed", value: summary?.total_billed },
    { label: "Total received", value: summary?.total_received },
    { label: "Outstanding", value: summary?.total_outstanding },
  ];

  return (
    <main className="dashboard reports-page">
      <section className="panel panel-header-row">
        <div>
          <p className="eyebrow">Customer reports</p>
          <h2>Customer report & Excel export</h2>
          <p className="muted">
            Bills filter by bill date. Payments filter by payment date. Outstanding uses bill balances in
            the bill-date range.
          </p>
        </div>
        <Link to="/reports" className="ghost-button link-button">
          All reports
        </Link>
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

      <section className="stat-grid report-stats">
        {cards.map((card) => (
          <article key={card.label} className="stat-card">
            <p>{card.label}</p>
            <strong>
              {loading ? "…" : card.raw ? card.value ?? 0 : formatMoney(card.value ?? 0)}
            </strong>
          </article>
        ))}
      </section>

      <section className="panel filters-bar report-filters">
        <input
          type="search"
          placeholder="Search customer name"
          value={searchName}
          maxLength={100}
          onChange={(event) => {
            setPage(1);
            setSearchName(event.target.value);
          }}
        />
        <input
          type="search"
          inputMode="numeric"
          placeholder="Search phone"
          value={searchPhone}
          maxLength={10}
          onChange={(event) => {
            setPage(1);
            setSearchPhone(digitsOnly(event.target.value, 10));
          }}
        />
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
        {datePreset === "custom" ? (
          <>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => {
                setPage(1);
                setDateFrom(event.target.value);
              }}
            />
            <input
              type="date"
              value={dateTo}
              onChange={(event) => {
                setPage(1);
                setDateTo(event.target.value);
              }}
            />
          </>
        ) : null}
      </section>

      <section className="panel report-toolbar">
        <div className="report-selection">
          <strong>{selectedCount}</strong>
          <span className="muted">selected</span>
          {filtersMeta?.filter_label ? (
            <span className="help-text">Date filter: {filtersMeta.filter_label}</span>
          ) : null}
        </div>
        <div className="report-actions">
          <button type="button" className="ghost-button" onClick={toggleAllPage} disabled={!customers.length}>
            {allPageSelected ? "Unselect page" : "Select page"}
          </button>
          <button type="button" className="ghost-button" onClick={clearSelection} disabled={!selectedCount}>
            Clear selection
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={!selectedCount || Boolean(exporting)}
            onClick={() => handleExport("selected")}
          >
            {exporting === "selected" ? "Exporting…" : "Export selected"}
          </button>
          <button
            type="button"
            className="ghost-button"
            disabled={Boolean(exporting)}
            onClick={() => handleExport("filtered")}
          >
            {exporting === "filtered" ? "Exporting…" : "Export filter results"}
          </button>
          <button
            type="button"
            className="ghost-button"
            disabled={Boolean(exporting)}
            onClick={() => handleExport("all")}
          >
            {exporting === "all" ? "Exporting…" : "Export all customers"}
          </button>
        </div>
      </section>

      <section className="panel table-panel">
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
                <th>Customer</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Bills</th>
                <th>Billed</th>
                <th>Paid</th>
                <th>Outstanding</th>
                <th>Created</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(customer.id)}
                      onChange={() => toggleOne(customer.id)}
                      aria-label={`Select ${customer.customer_name}`}
                    />
                  </td>
                  <td>
                    <Link to={`/customers/${customer.id}`} className="text-link">
                      {customer.customer_name}
                    </Link>
                  </td>
                  <td>{customer.phone}</td>
                  <td>{customer.email || "—"}</td>
                  <td>{customer.total_bills}</td>
                  <td>{formatMoney(customer.total_billed)}</td>
                  <td>{formatMoney(customer.total_paid)}</td>
                  <td className={customer.outstanding_balance > 0 ? "is-outstanding" : ""}>
                    {formatMoney(customer.outstanding_balance)}
                  </td>
                  <td>{formatDate(customer.created_at)}</td>
                  <td>
                    <StatusBadge status={customer.status} />
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
              Page {pagination.page} of {pagination.total_pages} · {pagination.total} customers
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
    </main>
  );
}

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-IN");
  } catch {
    return value;
  }
}
