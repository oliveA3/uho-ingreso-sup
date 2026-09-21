import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchStudentDashboard } from "../../api/student.service";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import StageStatusNotice from "../../components/StageStatusNotice/StageStatusNotice";
import { Card, StatCard, StatsGrid } from "../../components";
import styles from "./HomePage.module.css";

const stageLabels = {
  1: "Escalafón",
  2: "Interés",
  3: "Solicitud",
  4: "Pruebas",
  5: "Resultados",
  6: "Carrera",
};

function formatDate(value) {
  if (!value) return "Sin fecha definida";
  return new Intl.DateTimeFormat("es-CU", { day: "numeric", month: "long" }).format(new Date(`${value}T00:00:00`));
}

export default function EstudianteHomePage() {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStudentDashboard().then(setDashboard).catch((requestError) => setError(requestError.message));
  }, []);

  const academic = dashboard?.academic;
  const activeStage = dashboard?.active_stage;
  const stages = dashboard?.stages || [];
  const studentName = dashboard?.student?.nombre || "Estudiante";
  const activeEarlyStage = stages.find(
    (stage) => stage.estado === "en_curso" && stage.numero <= 3,
  )?.numero;
  const navLinkClass = (stageNumber) => `${styles.navLink} ${activeEarlyStage === stageNumber ? styles.navLinkActive : styles.navLinkInactive}`;

  const stats = [
    [academic?.indice_general ?? "--", "Índice General", "primary"],
    [academic?.position ? `#${academic.position}` : "--", "Posición Escalafón", "success"],
    [`${dashboard?.interest_count ?? 0}/10`, "Carreras Seleccionadas", "primary"],
    [`${dashboard?.confirmations_count ?? 0}`, "Pruebas Confirmadas", "primary"],
  ];

  return (
    <div className="space-y-6">
      <Card padding="p-6 sm:p-8">
        <header>
          <p className={styles.greeting}>¡Hola, {studentName}!</p>
          <p className={styles.subheading}>
            Proceso {new Date().getFullYear()} — {dashboard?.student?.escuela || "Escuela"} — {dashboard?.student?.municipio || "Municipio"}
          </p>
        </header>

        {error && <FeedbackMessage type="error" className="mt-6 rounded-2xl">{error}</FeedbackMessage>}
        <StageStatusNotice />

        <StatsGrid className="mt-6">
          {stats.map(([value, label, tone]) => (
            <StatCard key={label} label={label} value={value} tone={tone} />
          ))}
        </StatsGrid>

        <div className={styles.processSection}>
          <section className={styles.processCard}>
            <h2 className={styles.processTitle}>📈 Estado del Proceso</h2>
            <div className={styles.stageGrid}>
              {stages.map((stage) => {
                const completed = stage.estado === "completada";
                const active = stage.estado === "en_curso";
                return (
                  <div key={stage.numero} className={styles.stageItem}>
                    <div className={`${styles.stageBadge} ${completed ? styles.stageBadgeDone : active ? styles.stageBadgeActive : styles.stageBadgePending}`}>
                      {completed ? "✓" : stage.numero}
                    </div>
                    <p className={`${styles.stageLabel} ${active ? styles.stageLabelActive : ""}`}>{stageLabels[stage.numero]}</p>
                    <p className={styles.stageDates}>{stage.fecha_inicio ? formatDate(stage.fecha_inicio) : "Sin inicio"}<br />{stage.fecha_fin ? `al ${formatDate(stage.fecha_fin)}` : "Sin cierre"}</p>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className={styles.navLinks}>
          <Link to="escalafon" className={navLinkClass(1)}>📋 Ver Escalafón</Link>
          <Link to="boleta-interes" className={navLinkClass(2)}>🎯 Completar Boleta de Interés</Link>
          <Link to="boleta" className={navLinkClass(3)}>📝 Ver Boleta de Solicitud</Link>
        </div>
      </Card>
    </div>
  );
}
