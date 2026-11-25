export default function StatusBadge({ status }) {
  const normalized = ["suspended", "inactive", "active", "saved", "draft"].includes(status)
    ? status
    : "active";

  return <span className={`status-badge is-${normalized}`}>{normalized}</span>;
}
