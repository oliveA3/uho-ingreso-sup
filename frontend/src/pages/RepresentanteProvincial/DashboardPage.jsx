const stats = [
  { value: "14", label: "Municipios" },
  { value: "87", label: "Escuelas" },
  { value: "14", label: "Repr. Municipales" },
  { value: "174", label: "Usuarios Creados" },
];

const municipios = [
  { name: "Holguín", schools: "18", rep: "Luis Torres R.", status: "Activo" },
  { name: "Gibara", schools: "8", rep: "Ana López M.", status: "Activo" },
  { name: "Banes", schools: "6", rep: "—", status: "Sin Repr." },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700">Dashboard — Repr. Provincial</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Estructura territorial de Holguín</h1>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center">
              <div className="text-3xl font-semibold text-slate-900">{stat.value}</div>
              <div className="mt-2 text-sm text-slate-600">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Lista de Municipios</p>
            <p className="mt-2 text-sm text-slate-600">Revisar municipios, escuelas y representantes asignados.</p>
          </div>
          <button className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700">+ Agregar Municipio</button>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 text-left text-slate-700">
                <th className="border-b border-slate-200 px-4 py-3">Municipio</th>
                <th className="border-b border-slate-200 px-4 py-3">Escuelas</th>
                <th className="border-b border-slate-200 px-4 py-3">Repr. Municipal</th>
                <th className="border-b border-slate-200 px-4 py-3">Estado</th>
                <th className="border-b border-slate-200 px-4 py-3">Acc.</th>
              </tr>
            </thead>
            <tbody>
              {municipios.map((item) => (
                <tr key={item.name} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700">{item.name}</td>
                  <td className="px-4 py-3 text-slate-700">{item.schools}</td>
                  <td className="px-4 py-3 text-slate-700">{item.rep}</td>
                  <td className="px-4 py-3 text-slate-700">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${item.status === "Activo" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">👁 Escuelas</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
