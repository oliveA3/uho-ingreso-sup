import { Card } from "../index";

// Mirrors the role-string aliases used by SidebarSelector so a layout's
// allowed-role list stays in sync with which sidebar the user sees.
const ROLE_ALIASES = {
  superadmin: ["superadmin"],
  estudiante: ["estudiante"],
  jefe_comision: ["jefe_comision", "jefe comisión", "jefe comision"],
  repr_provincial: ["repr_provincial", "repr provincial", "ingreso_provincial", "ingreso provincial"],
  repr_municipal: ["repr_municipal", "repr municipal", "ingreso_municipal", "ingreso municipal"],
  secretario: ["secretario", "secretario_escuela"],
  director: ["director_escuela"],
};

function AccessCard({ title, message }) {
  return (
    <Card className="m-4" padding="p-8">
      <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      <p className="mt-4 text-sm text-slate-600">{message}</p>
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
