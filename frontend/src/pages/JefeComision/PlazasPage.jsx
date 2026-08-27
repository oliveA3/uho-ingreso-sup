import EntityActionButton from "../../components/Buttons/EntityActionButton";

const plazas = [
  { code: "INF-01", career: "Ing. Informática", seats: "60", type: "Municipal", ces: "UHo", sex: "A" },
  { code: "MED-01", career: "Medicina", seats: "45", type: "Provincial", ces: "UCMH", sex: "A" },
  { code: "DER-01", career: "Derecho", seats: "30", type: "Provincial", ces: "UHo", sex: "A" },
];

export default function PlazasPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700">Plan de Plazas 2025</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Gestión del Plan de Plazas</h1>
          <p className="mt-3 text-sm text-slate-600">Importa planes de plaza y administra el listado oficial por carrera.</p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-sm font-semibold text-slate-900">Importar desde Excel</p>
            <p className="mt-3 text-sm text-slate-600">Carga un archivo con los campos: código, nombre, plazas, tipo, CES, provincia y sexo.</p>
            <button className="mt-4 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700">Importar Plan de Plazas</button>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-sm font-semibold text-slate-900">Filtro</p>
            <select className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900">
              <option>Todos</option>
              <option>Municipal</option>
              <option>Provincial</option>
            </select>
            <button className="mt-4 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">+ Añadir</button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Plan de Plazas</p>
          </div>
          <button className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">Exportar</button>
        </div>

        <div className="table-scroll mt-6 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 text-left text-slate-700">
                <th className="border-b border-slate-200 px-4 py-3">Código</th>
                <th className="border-b border-slate-200 px-4 py-3">Carrera</th>
                <th className="border-b border-slate-200 px-4 py-3">Plazas</th>
                <th className="border-b border-slate-200 px-4 py-3">Tipo</th>
                <th className="border-b border-slate-200 px-4 py-3">CES</th>
                <th className="border-b border-slate-200 px-4 py-3">Sexo</th>
                <th className="border-b border-slate-200 px-4 py-3">Acc.</th>
              </tr>
            </thead>
            <tbody>
              {plazas.map((item) => (
                <tr key={item.code} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700">{item.code}</td>
                  <td className="px-4 py-3 text-slate-700">{item.career}</td>
                  <td className="px-4 py-3 text-slate-700">{item.seats}</td>
                  <td className="px-4 py-3 text-slate-700">{item.type}</td>
                  <td className="px-4 py-3 text-slate-700">{item.ces}</td>
                  <td className="px-4 py-3 text-slate-700">{item.sex}</td>
                  <td className="px-4 py-3 text-slate-700">
                    <EntityActionButton variant="edit">Editar</EntityActionButton>
                    <button className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">🗑</button>
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
