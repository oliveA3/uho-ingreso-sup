import styles from "./Buttons.module.css";

export default function PrimaryButton({ as: Element = "button", children, className = "", ...props }) {
  return (
    <Element className={`${styles.base} ${styles.primary} ${className}`} {...props}>
      {children}
    </Element>
  );
}
