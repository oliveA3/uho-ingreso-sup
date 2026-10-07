import { Outlet } from "react-router-dom";
import RequireRole from "../../components/RequireRole/RequireRole";
import styles from "./EstudianteLayout.module.css";

export default function EstudianteLayout({ user, onLogout }) {
  return (
    <RequireRole user={user} allow={["estudiante"]} panelTitle="Panel Estudiante">
      <div className={styles.content}>
        <div className={styles.contentInner}>
          <Outlet />
        </div>
      </div>
    </RequireRole>
  );
}
