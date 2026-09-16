import styles from "./StatCard.module.css";

const TONE_CLASS = {
  neutral: styles.toneNeutral,
  primary: styles.tonePrimary,
  success: styles.toneSuccess,
  warning: styles.toneWarning,
  error: styles.toneError,
};

export function StatsGrid({ children, className = "" }) {
  return <div className={`${styles.grid} ${className}`}>{children}</div>;
}

export default function StatCard({ label, value, caption, tone = "neutral" }) {
  return (
    <div className={`${styles.card} ${TONE_CLASS[tone] || TONE_CLASS.neutral}`}>
      <p className={styles.label}>{label}</p>
      <p className={styles.value}>{value}</p>
      {caption && <p className={styles.caption}>{caption}</p>}
    </div>
  );
}
