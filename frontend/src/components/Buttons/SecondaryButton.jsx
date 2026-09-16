import styles from "./Buttons.module.css";

export default function SecondaryButton({ children, className = "", ...props }) {
  return (
    <button type="button" className={`${styles.base} ${styles.secondary} ${className}`} {...props}>
      {children}
    </button>
  );
}
