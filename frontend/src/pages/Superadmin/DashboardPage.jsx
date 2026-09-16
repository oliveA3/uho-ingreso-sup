import { useEffect, useState } from "react";
import { fetchSuperAdminDashboard } from "../../services/api";
import StageStatusNotice from "../../components/StageStatusNotice/StageStatusNotice";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import { Card, PageHeader } from "../../components";
import styles from "./DashboardPage.module.css";

export default function DashboardPage({ user }) {
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSuperAdminDashboard()
      .then(setMetrics)
      .catch((requestError) => setError(requestError.message));
  }, []);

  const cards = [
    { value: metrics?.provincias_activas ?? "-", label: "Provincias Activas" },
    { value: metrics?.roles_definidos ?? "-", label: "Roles Definidos" },
    { value: metrics?.usuarios_totales ?? "-", label: "Usuarios Totales" },
    { value: "v2.0", label: "Versión" },
  ];
  return (
    <div className="space-y-6">
      <Card padding="p-8">
        <PageHeader
          title="Panel de Administración Global"
          subtitle="Super Admin"
          actions={
            <div className={styles.userPanel}>
              <p>{user.nombre || user.username} {user.apellidos || ""}</p>
              <p className={styles.userRole}>{user.rol_label || user.rol}</p>
            </div>
          }
        />

        {error && <FeedbackMessage type="error" className="mt-4 rounded-2xl">{error}</FeedbackMessage>}
        <StageStatusNotice />
        <div className={styles.statsGrid}>
          {cards.map((stat) => (
            <div key={stat.label} className={styles.statCard}>
              <p className={styles.statValue}>{stat.value}</p>
              <p className={styles.statLabel}>{stat.label}</p>
            </div>
          ))}
        </div>

        <div className={styles.infoBanner}>
          ⚙️ Acceso total. Gestiona nomencladores, roles, usuarios, identidad visual y configuración de despliegue.
        </div>
      </Card>
    </div>
  );
}
