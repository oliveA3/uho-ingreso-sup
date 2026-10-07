import styles from "./PageHeader.module.css";

export default function PageHeader({ eyebrow, title, subtitle, actions, className = "" }) {
  return (
    <div className={`${styles.header} ${className}`}>
      <div>
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
