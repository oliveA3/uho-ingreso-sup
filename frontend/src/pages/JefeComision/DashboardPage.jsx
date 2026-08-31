import { useEffect, useState } from "react";
import { fetchProvincialDashboard } from "../../services/api";
import ActiveStageNotice from "../../components/ActiveStageNotice";

export default function DashboardPage({ user }) {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProvincialDashboard()
      .then(setDashboard)
      .catch((requestError) => setError(requestError.message));
  }, []);

  if (error) {
    return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-sm text-rose-700">{error}</div>;
  }

  if (!dashboard) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600">Cargando información del dashboard...</div>;
  }

  const scope = user?.rol === "jefe_comision" ? "Provincial" : user?.rol_label || "General";
  const province = user?.provincia_nombre || "toda la provincia";
  const stats = [
    { value: dashboard.municipios, label: "Municipios" },
    { value: dashboard.escuelas, label: "Escuelas" },
    { value: dashboard.estudiantes, label: "Estudiantes" },
    { value: dashboard.estudiantes_con_cuenta, label: "Con Cuenta" },
    { value: dashboard.boletas_interes_enviadas, label: "Boletas Enviadas" },
    { value: dashboard.boletas_interes_pendientes, label: "Pendientes" },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">Dashboard Provincial</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Dashboard Provincial</h1>
            <p className="mt-3 text-sm text-slate-600">Información actual del proceso de ingreso</p>
          </div>
          <div className="rounded-3xl bg-slate-50 px-5 py-4 text-sm text-slate-700">
            <p>Alcance {scope}, {province}</p>
          </div>
        </div>

        <ActiveStageNotice />

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center">
              <div className="text-3xl font-semibold text-slate-900">{stat.value}</div>
              <div className="mt-2 text-sm text-slate-600">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">🗺️ Avance por Municipio</div>
          <p className="mt-2 text-xs text-slate-500">{dashboard.avance?.label || "Avance del proceso actual"}</p>
          <div className="mt-5 space-y-4">
            {dashboard.municipios_lista.map((municipio) => (
              <div key={municipio.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm text-slate-700">
                  <span>{municipio.nombre}</span>
                  <span>{municipio.completed}/{municipio.total} escuelas</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-2 rounded-full bg-sky-600" style={{ width: `${municipio.total ? municipio.completed / municipio.total * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">🏆 Top Carreras Solicitadas</div>
          <div className="mt-5 space-y-4">
            {dashboard.top_carreras.map((career) => (
              <div key={career.carrera__nombre} className="space-y-2">
                <div className="flex items-center justify-between text-sm text-slate-700">
                  <span>{career.carrera__nombre}</span>
                  <span>{career.total}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-2 rounded-full bg-sky-600" style={{ width: `${Math.min(100, career.total * 10)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
