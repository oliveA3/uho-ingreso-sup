const municipios = [
  { name: "Holguín", schools: "18", sent: "18/18", students: "1,240", status: "Completo" },
  { name: "Gibara", schools: "8", sent: "7/8", students: "521", status: "Parcial" },
  { name: "Banes", schools: "6", sent: "6/6", students: "390", status: "Completo" },
  { name: "Rafael Freyre", schools: "5", sent: "3/5", students: "315", status: "Pendiente" },
];

export default function EscalafonesPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700">Escalafones Recibidos</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Índices enviados por los secretarios</h1>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-emerald-50 p-6 text-center">
            <p className="text-sm text-slate-600">Escuelas Enviaron</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">72</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-amber-50 p-6 text-center">
            <p className="text-sm text-slate-600">Pendientes</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">15</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center">
            <p className="text-sm text-slate-600">Total Estudiantes</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">4,230</p>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
            <span>Estado por Municipio</span>
            <button className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white">📊 Exportar</button>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100 text-left text-slate-700">
                  <th className="border-b border-slate-200 px-4 py-3">Municipio</th>
                  <th className="border-b border-slate-200 px-4 py-3">Escuelas</th>
                  <th className="border-b border-slate-200 px-4 py-3">Enviaron</th>
                  <th className="border-b border-slate-200 px-4 py-3">Estudiantes</th>
                  <th className="border-b border-slate-200 px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {municipios.map((mun) => (
                  <tr key={mun.name} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">{mun.name}</td>
                    <td className="px-4 py-3 text-slate-700">{mun.schools}</td>
                    <td className="px-4 py-3 text-slate-700">{mun.sent}</td>
                    <td className="px-4 py-3 text-slate-700">{mun.students}</td>
                    <td className="px-4 py-3 text-slate-700">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${mun.status === "Completo" ? "bg-emerald-100 text-emerald-700" : mun.status === "Parcial" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>
                        {mun.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
