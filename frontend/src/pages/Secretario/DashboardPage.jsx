import StageStatusNotice from "../../components/StageStatusNotice/StageStatusNotice";
import { useEffect, useState } from "react";
import { fetchSchoolDashboard } from "../../api/school.service";
import BallotMetrics from "../../components/BallotMetrics/BallotMetrics";
import { PageHeader, StatCard, StatsGrid } from "../../components";
import styles from "./DashboardPage.module.css";

export default function SecretarioDashboardPage({ user, title = "Dashboard Secretario" }) {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => { fetchSchoolDashboard().then(setDashboard).catch((requestError) => setError(requestError.message)); }, []);

  if (error) return <div className={styles.errorBox}>{error}</div>;
  if (!dashboard) return <div className={styles.loadingBox}>Cargando información del dashboard...</div>;
  const total = dashboard.students || 1;
  const activeStageNumber = dashboard.active_stage?.numero || 0;
  const usesSolicitud = activeStageNumber >= 3;
  const ballotStats = usesSolicitud ? dashboard.solicitud : dashboard.interest;
  const ballotTitle = usesSolicitud ? "Boleta de Solicitud" : "Boleta de Interés";
  return (
    <div className={styles.card}>
      <div className={styles.cardInner}>
        <PageHeader
          title={title}
          subtitle="Resumen de etapa activa, estudiantes, boletas y escalafón para tu escuela."
          actions={<span className={styles.schoolBadge}>{user?.escuela_nombre || "Escuela no asignada"}</span>}
        />

        <StageStatusNotice />

        <StatsGrid>
          <StatCard label="Total Estudiantes" value={dashboard.students} />
          <StatCard label="Con cuenta" value={dashboard.students_with_account} />
          <StatCard label="Boletas enviadas" value={ballotStats.sent} />
        </StatsGrid>

        <div className={styles.panelsGrid}>
          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>Estado de Escalafón</h2>
            <div className={styles.progressList}>
              <div className={styles.progressRow}>
                <span>Aceptaron</span>
                <span className={styles.progressValue}>{dashboard.escalafon.accepted}</span>
              </div>
              <progress className={`${styles.progressTrack} ${styles.progressFillSuccess}`} value={dashboard.escalafon.accepted} max={total} aria-label={`Aceptaron: ${dashboard.escalafon.accepted}`} />
              <div className={styles.progressRow}>
                <span>Revisión</span>
                <span className={styles.progressValue}>{dashboard.escalafon.review}</span>
              </div>
              <progress className={`${styles.progressTrack} ${styles.progressFillWarning}`} value={dashboard.escalafon.review} max={total} aria-label={`En revisión: ${dashboard.escalafon.review}`} />
              <div className={styles.progressRow}>
                <span>Sin respuesta</span>
                <span className={styles.progressValue}>{dashboard.escalafon.no_response}</span>
              </div>
              <progress className={`${styles.progressTrack} ${styles.progressFillNeutral}`} value={dashboard.escalafon.no_response} max={total} aria-label={`Sin respuesta: ${dashboard.escalafon.no_response}`} />
            </div>
          </div>
          <div className={styles.panel}>
            <h2 className={styles.panelTitleSpaced}>{ballotTitle}</h2>
            <BallotMetrics items={[
              { label: "Enviadas", value: ballotStats.sent, tone: "success" },
              { label: "Pendientes", value: ballotStats.pending, tone: "warning" },
              ...(usesSolicitud ? [{ label: "Aprobadas", value: ballotStats.approved, tone: "info" }] : []),
              ...(usesSolicitud ? [{ label: "Modificadas", value: ballotStats.modified, tone: "orange" }] : []),
            ]} />
          </div>
        </div>
      </div>
    </div>
  );
}
