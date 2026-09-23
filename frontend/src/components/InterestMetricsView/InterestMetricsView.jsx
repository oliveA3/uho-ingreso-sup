import StageStatusNotice from "../StageStatusNotice/StageStatusNotice";
import styles from "./InterestMetricsView.module.css";

const toneClasses = {
  success: styles.toneSuccess,
  warning: styles.toneWarning,
  default: styles.toneDefault,
};

export default function InterestMetricsView({ metrics, title, schoolName }) {
  const maximum = Math.max(...(metrics.top_carreras || []).map((career) => career.total), 1);

  return (
    <div className={styles.wrapper}>
      <section className={styles.section}>
        <p className={styles.eyebrow}>Boletas de Interés</p>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{title}</h1>
          <span className={styles.schoolBadge}>{schoolName || "Escuela no asignada"}</span>
        </div>
        <p className={styles.subtitle}>Resumen de las boletas de interés de los estudiantes de tu escuela.</p>
        <StageStatusNotice stageNumber={2} />
        <div className={styles.metricsGrid}>
          <Metric label="Enviadas" value={metrics.enviadas} tone="success" />
          <Metric label="Pendientes" value={metrics.pendientes} tone="warning" />
          <Metric label="Total estudiantes" value={metrics.total} tone="default" />
        </div>
      </section>

      <section className={styles.sectionFlat}>
        <div className={styles.rankingSectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Demanda por carrera</p>
            <h2 className={styles.sectionTitle}>Top 10 carreras más solicitadas</h2>
          </div>
          <span className={styles.countText}>{metrics.total_boletas} boletas registradas</span>
        </div>
        {metrics.top_carreras?.length ? (
          <div className={styles.rankingList}>
            {metrics.top_carreras.map((career, index) => (
              <div key={career.id}>
                <div className={styles.rankingRow}>
                  <span className={styles.rankingName}>{index + 1}. {career.nombre}</span>
                  <span className={styles.rankingValue}>{career.total}</span>
                </div>
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{ width: `${(career.total / maximum) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyText}>Aún no hay carreras solicitadas.</p>
        )}
      </section>

      <section className={styles.distributionGrid}>
        <Distribution title="Distribución por sexo" items={metrics.sexo || []} />
        <Distribution title="Tipo de otorgamiento" items={metrics.tipo_otorgamiento || []} />
      </section>
    </div>
  );
}

function Metric({ label, value, tone }) {
  return (
    <div className={styles.metricCard}>
      <p className={styles.metricLabel}>{label}</p>
      <p className={`${styles.metricValue} ${toneClasses[tone] || toneClasses.default}`}>{value}</p>
    </div>
  );
}

function Distribution({ title, items }) {
  const total = items.reduce((sum, item) => sum + item.total, 0);

  return (
    <section className={styles.sectionFlat}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {items.length ? (
        <div className={styles.distributionList}>
          {items.map((item) => (
            <div key={item.label} className={styles.distributionRow}>
              <span className={styles.distributionLabel}>{item.label}</span>
              <span className={styles.distributionValue}>
                {item.total} <span className={styles.distributionPercent}>({total ? Math.round((item.total / total) * 100) : 0}%)</span>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.emptyText}>Sin datos disponibles.</p>
      )}
    </section>
  );
}
