import { useNavigate } from "react-router-dom";

export default function DashboardPage({ user }) {
  const navigate = useNavigate();
  const cards = [
    { value: "2", label: "Provincias Activas" },
    { value: "7", label: "Roles Definidos" },
    { value: "312", label: "Usuarios Totales" },
    { value: "v2.0", label: "Versión" },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">Super Admin</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Panel de Administración Global</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-600">IngresoSUP · Configuración y gestión del sistema.</p>
          </div>
          <div className="rounded-3xl bg-slate-50 px-5 py-4 text-sm text-slate-700">
            <p className="font-semibold">Usuario</p>
            <p>{user.first_name || user.nombre || user.username} {user.last_name || user.apellidos || ""}</p>
            <p className="text-slate-500">{user.rol_label || user.rol}</p>
          </div>
        </div>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Panel de Administración Global</h2>
            <p className="mt-2 text-sm text-slate-600">Accede a métricas clave del sistema y los módulos principales.</p>
          </div>
          <div className="rounded-3xl bg-slate-50 px-5 py-4 text-sm text-slate-700">
            <p className="font-semibold">Alcance</p>
            <p>Acceso Global</p>
          </div>
        </div>

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

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Atajos del sistema</h2>
            <p className="mt-2 text-sm text-slate-600">Navega rápidamente a las secciones más importantes del panel.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/superadmin/roles")}
            className="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
          >
            Abrir roles
          </button>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[
            { title: "Nomencladores", description: "Provincias, municipios, escuelas y más." },
            { title: "Usuarios", description: "Gestión completa de usuario y roles." },
            { title: "Despliegue", description: "Información de Docker y servicios." },
          ].map((item) => (
            <div key={item.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-lg font-semibold text-slate-900">{item.title}</p>
              <p className="mt-2 text-sm text-slate-600">{item.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
