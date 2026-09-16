import styles from "./Card.module.css";

export default function Card({ as: Element = "div", children, className = "", padding = "p-6", ...props }) {
  return (
    <Element className={`${styles.card} ${padding} ${className}`} {...props}>
      {children}
    </Element>
  );
}
