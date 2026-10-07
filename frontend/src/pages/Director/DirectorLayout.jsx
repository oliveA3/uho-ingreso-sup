import { Outlet } from "react-router-dom";
import RequireRole from "../../components/RequireRole/RequireRole";
import styles from "./DirectorLayout.module.css";

export default function DirectorLayout({ user }) {
  return (
    <RequireRole user={user} allow={["director"]} panelTitle="Panel Director">
      <div className={styles.content}>
        <div className={styles.contentInner}>
          <Outlet />
        </div>
      </div>
    </RequireRole>
  );
}
