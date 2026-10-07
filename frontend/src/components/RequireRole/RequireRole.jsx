import { Card } from "../index";
import styles from "./RequireRole.module.css";

// Mirrors the role-string aliases used by SidebarSelector so a layout's
// allowed-role list stays in sync with which sidebar the user sees.
const ROLE_ALIASES = {
  superadmin: ["superadmin"],
  estudiante: ["estudiante"],
  jefe_comision: ["jefe_comision", "jefe comisión", "jefe comision"],
  repr_provincial: ["repr_provincial", "repr provincial", "ingreso_provincial", "ingreso provincial"],
  repr_municipal: ["repr_municipal", "repr municipal", "ingreso_municipal", "ingreso municipal"],
  gestor_noticias: ["gestor_noticias"],
  secretario: ["secretario", "secretario_escuela"],
  director: ["director_escuela"],
};

function AccessCard({ title, message }) {
  return (
    <Card className={styles.accessCard} padding="p-6">
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.message}>{message}</p>
    </Card>
  );
}

/**
 * Gates a layout's Outlet by role, not just by session presence.
 * `allow` is a list of keys from ROLE_ALIASES (or raw role strings).
 */
export default function RequireRole({ user, allow, panelTitle = "Panel", children }) {
  if (!user) {
    return <AccessCard title={panelTitle} message="Inicia sesión para acceder a esta área." />;
  }

  const normalizedRole = String(user.rol || "").toLowerCase();
  const allowedValues = allow.flatMap((key) => ROLE_ALIASES[key] || [String(key).toLowerCase()]);

  if (!allowedValues.includes(normalizedRole)) {
    return (
      <AccessCard
        title="Acceso denegado"
        message="No tienes permisos para acceder a esta área."
      />
    );
  }

  return children;
}
