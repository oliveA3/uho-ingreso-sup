import styles from "./Input.module.css";

export default function Input({ className = "", invalid = false, ...props }) {
  return (
    <input
      className={`${styles.input} ${invalid ? styles.invalid : ""} ${className}`.trim()}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}
