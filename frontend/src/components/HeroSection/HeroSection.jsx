import styles from "./HeroSection.module.css";

export default function HeroSection({ onViewPlan, onViewResults, onViewAwards, isAuthenticated, activeStageNumber }) {
  const currentYear = new Date().getFullYear();
  const closestStage = [3, 5, 6].reduce((closest, stage) => {
    if (activeStageNumber == null) return closest;
    return Math.abs(stage - activeStageNumber) < Math.abs(closest - activeStageNumber) ? stage : closest;
  }, 3);

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>Proceso de Ingreso {currentYear}</p>
        <h1 className={styles.title}>IngresoSUP</h1>
        <p className={styles.description}>
          Información oficial sobre el proceso de solicitud y otorgamiento de carreras del Curso Diurno. Accede a noticias, planes de plazas, índices de corte y oferta de carreras.
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            onClick={onViewPlan}
            className={`${styles.actionButton} ${closestStage === 3 ? styles.actionButtonActive : styles.actionButtonInactive}`}
          >
            📋 Ver planes de plazas
          </button>
          {isAuthenticated && <button
            type="button"
            onClick={onViewResults}
            className={`${styles.actionButton} ${closestStage === 5 ? styles.actionButtonActive : styles.actionButtonInactive}`}
          >
            📊 Ver notas de pruebas
          </button>}
          {isAuthenticated && <button type="button" onClick={onViewAwards} className={`${styles.actionButton} ${closestStage === 6 ? styles.actionButtonActive : styles.actionButtonInactive}`}>
            🎓 Ver otorgamientos
          </button>}
        </div>
      </div>
    </section>
  );
}
