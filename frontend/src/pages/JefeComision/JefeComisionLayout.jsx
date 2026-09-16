import { Outlet } from "react-router-dom";
import RequireRole from "../../components/RequireRole/RequireRole";
import styles from "./JefeComisionLayout.module.css";

export default function JefeComisionLayout({ user, onLogout }) {
  return (
    <RequireRole user={user} allow={["jefe_comision"]} panelTitle="Panel Jefe Comisión">
      <div className={styles.content}>
        <div className={styles.contentInner}>
          <Outlet />
        </div>
      </div>
    </RequireRole>
  );
}
