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
        // `tone` is the preferred API (maps to the shared CSS module / brand
        // tokens below). `color` is kept for backwards compatibility with
        // callers outside this refactor's scope that still pass a raw
        // className.
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
