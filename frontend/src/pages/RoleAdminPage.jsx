import { useEffect, useState } from "react";
import { fetchRoleAdmin } from "../services/api";

export default function RoleAdminPage({ user }) {
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadRoles() {
      try {
        const data = await fetchRoleAdmin();
        setRoles(data.roles);
      } catch (err) {
        setError(err.message || "No se pudo cargar la información de roles.");
      }
    }

    loadRoles();
  }, []);

  if (!user) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Administración de Roles</h1>
        <p className="mt-4 text-sm text-slate-600">Debes iniciar sesión como Super Administrador para ver esta pantalla.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Administración de Roles</h1>
        <p className="mt-2 text-sm text-slate-600">Visualiza los roles definidos en el sistema y sus permisos asociados.</p>
      </div>
      {error && <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{error}</div>}
      <div className="grid gap-5 md:grid-cols-2">
        {roles.map((role) => (
          <article key={role.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">{role.name}</h2>
            <p className="mt-2 text-sm text-slate-600">{role.description || "Sin descripción disponible."}</p>
            <div className="mt-4 text-sm text-slate-700">
              <p>
                <span className="font-semibold">Nivel:</span> {role.level}
              </p>
              <p className="mt-2 font-semibold">Permisos:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600">
                {role.permissions.length > 0 ? (
                  role.permissions.map((permission, index) => <li key={index}>{permission}</li>)
                ) : (
                  <li>Sin permisos específicos asignados.</li>
                )}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
