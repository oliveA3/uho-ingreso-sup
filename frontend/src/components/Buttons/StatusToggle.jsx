import styles from "./Buttons.module.css";

export default function StatusToggle({ active, onClick, activeLabel = "Activo", inactiveLabel = "Inactivo", className = "", ...props }) {
  const color = active ? "var(--color-exito, #1a7a4a)" : "var(--color-error, #c0392b)";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${styles.base} ${styles.small} ${className}`}
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 10%, var(--blanco))`,
        borderColor: `color-mix(in srgb, ${color} 35%, var(--blanco))`,
        color,
      }}
      {...props}
    >
      {active ? activeLabel : inactiveLabel}
    </button>
  );
}
