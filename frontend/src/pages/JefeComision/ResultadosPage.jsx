const reclamaciones = [
  { student: "María González P.", subject: "Matemática", grade: "84", school: "IPVCE F. Engels" },
  { student: "Pedro Álvarez C.", subject: "Historia", grade: "75", school: "IPVCE F. Engels" },
];

export default function ResultadosPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700">Gestión de Resultados</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Importar notas y gestionar reclamaciones</h1>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-700">
              Asignatura
              <select className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900">
                <option>Matemática</option>
                <option>Español</option>
                <option>Historia</option>
              </select>
            </label>
            <label className="space-y-2 text-sm text-slate-700">
              Fecha Límite Reclamaciones
              <input type="date" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900" defaultValue="2025-03-05" />
            </label>
          </div>
          <button className="mt-4 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">Importar resultados desde Excel</button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">Reclamaciones Pendientes</p>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">18</span>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 text-left text-slate-700">
                <th className="border-b border-slate-200 px-4 py-3">Estudiante</th>
                <th className="border-b border-slate-200 px-4 py-3">Asignatura</th>
                <th className="border-b border-slate-200 px-4 py-3">Nota</th>
                <th className="border-b border-slate-200 px-4 py-3">Escuela</th>
                <th className="border-b border-slate-200 px-4 py-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {reclamaciones.map((item) => (
                <tr key={item.student} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700">{item.student}</td>
                  <td className="px-4 py-3 text-slate-700">{item.subject}</td>
                  <td className="px-4 py-3 text-slate-700">{item.grade}</td>
                  <td className="px-4 py-3 text-slate-700">{item.school}</td>
                  <td className="px-4 py-3 text-slate-700 space-x-2">
                    <button className="rounded-2xl bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-700">✅ Aceptar</button>
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
