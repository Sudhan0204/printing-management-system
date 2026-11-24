export default function StatusBadge({ status }) {
  const normalized = status === "suspended" ? "suspended" : "active";

  return <span className={`status-badge is-${normalized}`}>{normalized}</span>;
}
