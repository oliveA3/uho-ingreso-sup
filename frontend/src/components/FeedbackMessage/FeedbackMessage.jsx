const styles = {
  error: {
    icon: "✕",
    className: "border-rose-400 bg-rose-50 text-rose-800",
  },
  warning: {
    icon: "⚠",
    className: "border-amber-400 bg-amber-50 text-amber-800",
  },
  success: {
    icon: "✓",
    className: "border-emerald-400 bg-emerald-50 text-emerald-800",
  },
};

export default function FeedbackMessage({ type = "error", children, className = "" }) {
  const variant = styles[type] || styles.error;

  return (
    <div
      role={type === "error" ? "alert" : "status"}
      className={`flex items-center gap-3 border-l-4 px-4 py-3 text-sm ${variant.className} ${className}`}
    >
      <span aria-hidden="true" className="shrink-0 text-base font-semibold">{variant.icon}</span>
      <span>
        {children}
      </span>
    </div>
  );
}
