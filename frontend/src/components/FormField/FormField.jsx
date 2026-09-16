import styles from "./FormField.module.css";

export default function FormField({ label, htmlFor, children, className = "" }) {
  return (
    <label htmlFor={htmlFor} className={`${styles.field} ${className}`}>
      {label}
      {children}
    </label>
  );
}
