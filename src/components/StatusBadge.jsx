const LABELS = {
  active: "active",
  inactive: "inactive",
  suspended: "suspended",
  saved: "saved",
  draft: "draft",
  unpaid: "unpaid",
  partially_paid: "partial",
  paid: "paid",
};

export default function StatusBadge({ status }) {
  const normalized = LABELS[status] ? status : "active";
  const label = LABELS[normalized] || normalized;

  return <span className={`status-badge is-${normalized}`}>{label}</span>;
}
