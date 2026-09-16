import { Outlet } from "react-router-dom";
import styles from "./JefeComisionLayout.module.css";

export default function JefeComisionLayout({ user, onLogout }) {
  if (!user) {
    return (
      <div className={styles.guestCard}>
        <h1 className={styles.guestTitle}>Panel Jefe Comisión</h1>
        <p className={styles.guestMessage}>Inicia sesión para acceder a esta área.</p>
      </div>
    );
  }

  return (
    <div className={styles.content}>
      <div className={styles.contentInner}>
        <Outlet />
      </div>
    </div>
  );
}
