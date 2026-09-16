import styles from "./Buttons.module.css";

const variantStyles = {
  edit: {
    backgroundColor: "color-mix(in srgb, var(--brand-primary, #1f4e79) 10%, white)",
    borderColor: "color-mix(in srgb, var(--brand-primary, #1f4e79) 35%, white)",
    color: "var(--brand-primary, #1f4e79)",
  },
  delete: {
    backgroundColor: "color-mix(in srgb, var(--brand-error, #c0392b) 10%, white)",
    borderColor: "color-mix(in srgb, var(--brand-error, #c0392b) 35%, white)",
    color: "var(--brand-error, #c0392b)",
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
