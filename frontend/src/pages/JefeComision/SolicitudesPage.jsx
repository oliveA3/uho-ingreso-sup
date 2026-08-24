const modifications = [
  { student: "Pedro Álvarez Cruz", school: "IPVCE F. Engels", municipality: "Holguín", date: "24/01/2025" },
];

export default function SolicitudesPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700">Solicitudes — Vista Provincial</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Estado de boletas y modificaciones</h1>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-emerald-50 p-6 text-center">
            <p className="text-sm text-slate-600">Aprobadas</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">2,890</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-amber-50 p-6 text-center">
            <p className="text-sm text-slate-600">Pend. Secretario</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">850</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-rose-50 p-6 text-center">
            <p className="text-sm text-slate-600">Mod. por Aprobar</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">34</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">Modificaciones Pendientes</p>
        </div>

        <div className="table-scroll mt-6 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 text-left text-slate-700">
                <th className="border-b border-slate-200 px-4 py-3">Estudiante</th>
                <th className="border-b border-slate-200 px-4 py-3">Escuela</th>
                <th className="border-b border-slate-200 px-4 py-3">Municipio</th>
                <th className="border-b border-slate-200 px-4 py-3">Solicitado</th>
                <th className="border-b border-slate-200 px-4 py-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {modifications.map((mod) => (
                <tr key={mod.student} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700">{mod.student}</td>
                  <td className="px-4 py-3 text-slate-700">{mod.school}</td>
                  <td className="px-4 py-3 text-slate-700">{mod.municipality}</td>
                  <td className="px-4 py-3 text-slate-700">{mod.date}</td>
                  <td className="px-4 py-3 text-slate-700 space-x-2">
                    <button className="rounded-2xl bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-700">✅ Aprobar</button>
                    <button className="rounded-2xl bg-rose-100 px-3 py-2 text-sm font-semibold text-rose-700">❌ Rechazar</button>
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
