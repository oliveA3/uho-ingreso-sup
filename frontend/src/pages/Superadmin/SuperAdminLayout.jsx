import { Outlet } from "react-router-dom";
import { Card } from "../../components";
import styles from "./SuperAdminLayout.module.css";

export default function SuperAdminLayout({ user, onLogout }) {
  const isSuperAdmin = String(user?.rol || user?.rol_label || "").toLowerCase().includes("super");

  if (!user) {
    return (
      <Card padding="p-8" className={styles.stateCard}>
        <h1 className={styles.stateTitle}>Panel Super Administrador</h1>
        <p className={styles.stateMessage}>Inicia sesión para acceder a esta área.</p>
      </Card>
    );
  }

  if (!isSuperAdmin) {
    return (
      <Card padding="p-8" className={styles.stateCard}>
        <h1 className={styles.stateTitle}>Acceso denegado</h1>
        <p className={styles.stateMessage}>Este panel está reservado para usuarios con rol Super Administrador.</p>
      </Card>
    );
  }

  return (
    <div className={styles.layout}>
      <div className="space-y-6">
        <Outlet context={{ user }} />
      </div>
    </div>
  );
}
