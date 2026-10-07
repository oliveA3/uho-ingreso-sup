import { Outlet } from "react-router-dom";
import RequireRole from "../../components/RequireRole/RequireRole";
import styles from "./RepresentanteMunicipalLayout.module.css";

export default function RepresentanteMunicipalLayout({ user, onLogout }) {
  return (
    <RequireRole user={user} allow={["repr_municipal"]} panelTitle="Panel Repr. Municipal">
      <div className={styles.content}>
        <div className={styles.contentInner}>
          <Outlet />
        </div>
      </div>
    </RequireRole>
  );
}
