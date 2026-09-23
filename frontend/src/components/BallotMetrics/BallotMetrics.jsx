import styles from "./BallotMetrics.module.css";

const toneClasses = {
  default: styles.toneDefault,
  info: styles.toneInfo,
  warning: styles.toneWarning,
  success: styles.toneSuccess,
  danger: styles.toneDanger,
  orange: styles.toneOrange,
};

export default function BallotMetrics({ items }) {
  return (
    <div className={styles.grid}>
      {items.map((item) => {
        const valueClassName = item.tone
          ? toneClasses[item.tone] || toneClasses.default
          : item.color || styles.toneDefault;

        return (
          <div key={item.label} className={styles.card}>
            <p className={styles.label}>{item.label}</p>
            <p className={`${styles.value} ${valueClassName}`}>{item.value ?? 0}</p>
          </div>
        );
      })}
    </div>
  );
}
