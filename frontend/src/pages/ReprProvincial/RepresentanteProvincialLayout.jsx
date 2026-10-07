import { Outlet } from "react-router-dom";
import RequireRole from "../../components/RequireRole/RequireRole";
import styles from "./RepresentanteProvincialLayout.module.css";

export default function RepresentanteProvincialLayout({ user, onLogout }) {
  return (
    <RequireRole user={user} allow={["repr_provincial"]} panelTitle="Panel Repr. Provincial">
      <div className={styles.content}>
        <div className={styles.contentInner}>
          <Outlet />
        </div>
      </div>
    </RequireRole>
  );
}
