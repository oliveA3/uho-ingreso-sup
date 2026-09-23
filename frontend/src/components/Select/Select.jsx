import styles from "./Select.module.css";

export default function Select({ className = "", children, invalid = false, ...props }) {
  return (
    <select
      className={`${styles.select} ${invalid ? styles.invalid : ""} ${className}`.trim()}
      aria-invalid={invalid || undefined}
      {...props}
    >
      {children}
    </select>
  );
}
