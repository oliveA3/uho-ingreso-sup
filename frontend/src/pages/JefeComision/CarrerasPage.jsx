const carreras = [
  { code: "INF-01", name: "Ing. Informática", ces: "UHo", province: "Holguín", status: "Activo" },
  { code: "MED-01", name: "Medicina", ces: "UCMH", province: "Holguín", status: "Activo" },
  { code: "DER-01", name: "Derecho", ces: "UHo", province: "Holguín", status: "Activo" },
];

export default function CarrerasPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700">Catálogo de Carreras</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Lista de carreras</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">+ Añadir Carrera</button>
            <button className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700">Importar Excel</button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100 text-left text-slate-700">
              <th className="border-b border-slate-200 px-4 py-3">Código</th>
              <th className="border-b border-slate-200 px-4 py-3">Nombre</th>
              <th className="border-b border-slate-200 px-4 py-3">CES</th>
              <th className="border-b border-slate-200 px-4 py-3">Provincia</th>
              <th className="border-b border-slate-200 px-4 py-3">Estado</th>
              <th className="border-b border-slate-200 px-4 py-3">Acc.</th>
            </tr>
          </thead>
          <tbody>
            {carreras.map((career) => (
              <tr key={career.code} className="border-b border-slate-200 hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-700">{career.code}</td>
                <td className="px-4 py-3 text-slate-700">{career.name}</td>
                <td className="px-4 py-3 text-slate-700">{career.ces}</td>
                <td className="px-4 py-3 text-slate-700">{career.province}</td>
                <td className="px-4 py-3 text-slate-700">{career.status}</td>
                <td className="px-4 py-3 text-slate-700 space-x-2">
                  <button className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">✏️</button>
                  <button className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">🗑</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
