import styles from "./FeedbackMessage.module.css";

const variants = {
  error: { icon: "✕", className: "error" },
  warning: { icon: "⚠", className: "warning" },
  success: { icon: "✓", className: "success" },
};

export default function FeedbackMessage({ type = "error", children, className = "" }) {
  const variant = variants[type] || variants.error;

  return (
    <div
      role={type === "error" ? "alert" : "status"}
      className={`${styles.container} ${styles[variant.className]} ${className}`}
    >
      <span aria-hidden="true" className={styles.icon}>{variant.icon}</span>
      <span>
        {children}
      </span>
    </div>
  );
}
