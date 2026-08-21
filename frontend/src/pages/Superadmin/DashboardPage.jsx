import { useEffect, useState } from "react";
import { fetchSuperAdminDashboard } from "../../services/api";

export default function DashboardPage({ user }) {
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSuperAdminDashboard()
      .then(setMetrics)
      .catch((requestError) => setError(requestError.message));
  }, []);

  const cards = [
    { value: metrics?.provincias_activas ?? "-", label: "Provincias Activas" },
    { value: metrics?.roles_definidos ?? "-", label: "Roles Definidos" },
    { value: metrics?.usuarios_totales ?? "-", label: "Usuarios Totales" },
    { value: "v2.0", label: "Versión" },
  ];
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700 mb-4">Super Admin</p>
            <h2 className="text-2xl font-semibold text-slate-900">Panel de Administración Global</h2>
          </div>
          <div className="rounded-3xl bg-slate-50 px-5 py-4 text-sm text-slate-700">
            <p>{user.nombre || user.username} {user.apellidos || ""}</p>
            <p className="text-slate-500">{user.rol_label || user.rol}</p>
          </div>
        </div>

        {error && <p className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((stat) => (
            <div key={stat.label} className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-3xl font-semibold text-slate-900">{stat.value}</p>
              <p className="mt-2 text-sm text-slate-600">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700">
          ⚙️ Acceso total. Gestiona nomencladores, roles, usuarios, identidad visual y configuración de despliegue.
        </div>
      </section>

    </div>
  );
}
