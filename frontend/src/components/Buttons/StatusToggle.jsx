import styles from "./Buttons.module.css";

export default function StatusToggle({ active, onClick, activeLabel = "Activo", inactiveLabel = "Inactivo", className = "", ...props }) {
  const color = active ? "var(--brand-success, #1a7a4a)" : "var(--brand-error, #c0392b)";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${styles.base} ${styles.small} ${className}`}
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
