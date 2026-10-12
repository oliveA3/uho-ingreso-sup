import styles from "./Buttons.module.css";

export default function StatusToggle({ active, onClick, activeLabel = "Activo", inactiveLabel = "Inactivo", className = "", ...props }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${styles.base} ${styles.small} ${active ? styles.statusActive : styles.statusInactive} ${className}`}
      {...props}
    >
      {active ? activeLabel : inactiveLabel}
    </button>
  );
}
