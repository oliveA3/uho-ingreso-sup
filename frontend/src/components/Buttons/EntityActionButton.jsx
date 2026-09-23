import styles from "./Buttons.module.css";

const variantStyles = {
  edit: {
    backgroundColor: "color-mix(in srgb, var(--color-primario, #1f4e79) 10%, var(--blanco))",
    borderColor: "color-mix(in srgb, var(--color-primario, #1f4e79) 35%, var(--blanco))",
    color: "var(--color-primario, #1f4e79)",
  },
  delete: {
    backgroundColor: "color-mix(in srgb, var(--color-error, #c0392b) 10%, var(--blanco))",
    borderColor: "color-mix(in srgb, var(--color-error, #c0392b) 35%, var(--blanco))",
    color: "var(--color-error, #c0392b)",
  },
};

export default function EntityActionButton({ variant, children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={`${styles.base} ${styles.small} ${className}`}
      style={variantStyles[variant]}
      {...props}
    >
      {children}
    </button>
  );
}
