const stats = [
  { value: "14", label: "Municipios" },
  { value: "87", label: "Escuelas" },
  { value: "4,230", label: "Estudiantes" },
  { value: "3,811", label: "Con Cuenta" },
  { value: "2,640", label: "Boletas Enviadas" },
  { value: "1,590", label: "Pendientes" },
];

const topMunicipios = [
  { name: "Holguín", percent: 78 },
  { name: "Gibara", percent: 65 },
  { name: "Banes", percent: 58 },
  { name: "R. Freyre", percent: 45 },
  { name: "Moa", percent: 38 },
];

const topCarreras = [
  { name: "Medicina", value: 412 },
  { name: "Ing. Informática", value: 344 },
  { name: "Derecho", value: 251 },
  { name: "Ing. Industrial", value: 184 },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">Dashboard Provincial</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Holguín</h1>
            <p className="mt-3 text-sm text-slate-600">Proceso de Ingreso 2025</p>
          </div>
          <div className="rounded-3xl bg-slate-50 px-5 py-4 text-sm text-slate-700">
            <p className="font-semibold">Etapa Activa</p>
            <p>Boleta de Interés</p>
            <p className="text-slate-500">22/01 - 30/01/2025</p>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-emerald-50 p-5 text-sm text-emerald-700">
          ✅ Etapa activa: <strong>Boleta de Interés</strong> — 22/01 al 30/01/2025
        </div>

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
          <div className="mt-5 space-y-4">
            {topMunicipios.map((municipio) => (
              <div key={municipio.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm text-slate-700">
                  <span>{municipio.name}</span>
                  <span>{municipio.percent}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-2 rounded-full bg-sky-600" style={{ width: `${municipio.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">🏆 Top Carreras Solicitadas</div>
          <div className="mt-5 space-y-4">
            {topCarreras.map((career) => (
              <div key={career.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm text-slate-700">
                  <span>{career.name}</span>
                  <span>{career.value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-2 rounded-full bg-sky-600" style={{ width: `${Math.min(100, career.value / 4.5)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
