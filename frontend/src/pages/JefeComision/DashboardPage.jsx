import { useEffect, useState } from "react";
import { fetchProvincialDashboard } from "../../api/provincial.service";
import StageStatusNotice from "../../components/StageStatusNotice/StageStatusNotice";
import { StatCard, StatsGrid } from "../../components";
import styles from "./DashboardPage.module.css";

export default function DashboardPage({ user }) {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProvincialDashboard()
      .then(setDashboard)
      .catch((requestError) => setError(requestError.message));
  }, []);

  if (error) {
    return <div className={styles.errorBox}>{error}</div>;
  }

  if (!dashboard) {
    return <div className={styles.loadingBox}>Cargando información del dashboard...</div>;
  }

  const scope = user?.rol === "jefe_comision" ? "Provincial" : user?.rol_label || "General";
  const province = user?.provincia_nombre || "toda la provincia";
  const stats = [
    { value: dashboard.municipios, label: "Municipios" },
    { value: dashboard.escuelas, label: "Escuelas" },
    { value: dashboard.estudiantes, label: "Estudiantes" },
    { value: dashboard.estudiantes_con_cuenta, label: "Con Cuenta" },
    { value: dashboard.boletas_interes_enviadas, label: "Boletas Enviadas" },
    { value: dashboard.boletas_interes_pendientes, label: "Pendientes" },
  ];

  return (
    <div className={styles.page}>
      <section className={styles.heroCard}>
        <div className={styles.heroTop}>
          <div>
            <h1 className={styles.title}>Dashboard Provincial</h1>
            <p className={styles.subtitle}>Información actual del proceso de ingreso</p>
          </div>
          <div className={styles.scopeBox}>
            <p>Alcance {scope}, {province}</p>
          </div>
        </div>

        <StageStatusNotice />

        <StatsGrid className={styles.statsGrid}>
          {stats.map((stat) => (
            <StatCard key={stat.label} label={stat.label} value={stat.value} />
          ))}
        </StatsGrid>
      </section>

      <div className={styles.panelsGrid}>
        <section className={styles.panel}>
          <div className={styles.panelTitle}>🗺️ Avance por Municipio</div>
          <p className={styles.panelSubtitle}>{dashboard.avance?.label || "Avance del proceso actual"}</p>
          <div className={styles.progressList}>
            {dashboard.municipios_lista.map((municipio) => (
              <div key={municipio.id} className={styles.progressRow}>
                <div className={styles.progressLabels}>
                  <span>{municipio.nombre}</span>
                  <span>{municipio.completed}/{municipio.total} escuelas</span>
                </div>
                <progress
                  className={styles.progressTrack}
                  value={municipio.completed}
                  max={municipio.total || 1}
                  aria-label={`${municipio.nombre}: ${municipio.completed} de ${municipio.total} escuelas`}
                />
              </div>
            ))}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelTitle}>🏆 Top Carreras Solicitadas</div>
          <div className={styles.progressList}>
            {dashboard.top_carreras.map((career) => (
              <div key={career.carrera__nombre} className={styles.progressRow}>
                <div className={styles.progressLabels}>
                  <span>{career.carrera__nombre}</span>
                  <span>{career.total}</span>
                </div>
                <progress
                  className={styles.progressTrack}
                  value={career.total}
                  max={10}
                  aria-label={`${career.carrera__nombre}: ${career.total} solicitudes`}
                />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
