import styles from "./Buttons.module.css";

const variantClasses = {
  edit: styles.edit,
  delete: styles.delete,
};

export default function EntityActionButton({ variant, children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={`${styles.base} ${styles.small} ${variantClasses[variant] || ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
