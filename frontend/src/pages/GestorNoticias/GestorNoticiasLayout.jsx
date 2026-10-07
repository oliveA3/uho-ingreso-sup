import { Outlet } from "react-router-dom";
import RequireRole from "../../components/RequireRole/RequireRole";
import styles from "./GestorNoticiasLayout.module.css";

export default function GestorNoticiasLayout({ user }) {
  return (
    <RequireRole user={user} allow={["gestor_noticias"]} panelTitle="Panel Gestor de Noticias">
      <div className={styles.content}>
        <div className={styles.contentInner}>
          <Outlet />
        </div>
      </div>
    </RequireRole>
  );
}
