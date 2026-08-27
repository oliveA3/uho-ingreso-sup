export default function StatusToggle({ active, onClick, activeLabel = "Activo", inactiveLabel = "Inactivo", className = "", ...props }) {
  const color = active ? "var(--brand-success, #1a7a4a)" : "var(--brand-error, #c0392b)";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-2xl border px-3 py-2 text-xs font-semibold transition hover:brightness-95 ${className}`}
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 10%, white)`,
        borderColor: `color-mix(in srgb, ${color} 35%, white)`,
        color,
      }}
      {...props}
    >
      {active ? activeLabel : inactiveLabel}
    </button>
  );
}
