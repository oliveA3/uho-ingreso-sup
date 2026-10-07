import { Outlet } from "react-router-dom";
import RequireRole from "../../components/RequireRole/RequireRole";
import styles from "./SecretarioLayout.module.css";

export default function SecretarioLayout({ user, onLogout }) {
  return (
    <RequireRole user={user} allow={["secretario"]} panelTitle="Panel Secretario">
      <div className={styles.content}>
        <div className={styles.contentInner}>
          <Outlet />
        </div>
      </div>
    </RequireRole>
  );
}
