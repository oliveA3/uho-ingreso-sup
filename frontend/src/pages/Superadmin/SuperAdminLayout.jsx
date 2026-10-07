import { Outlet } from "react-router-dom";
import RequireRole from "../../components/RequireRole/RequireRole";
import styles from "./SuperAdminLayout.module.css";

export default function SuperAdminLayout({ user, onLogout }) {
  return (
    <RequireRole user={user} allow={["superadmin"]} panelTitle="Panel Super Administrador">
      <div className={styles.layout}>
        <div className={styles.contentInner}>
          <Outlet context={{ user }} />
        </div>
      </div>
    </RequireRole>
  );
}
