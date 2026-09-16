import styles from "./Select.module.css";

export default function Select({ className = "", children, ...props }) {
  return (
    <select className={`${styles.select} ${className}`} {...props}>
      {children}
    </select>
  );
}
