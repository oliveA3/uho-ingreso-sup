import { useMemo, useState } from "react";

export default function PlanPlazasSection({ items }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Todos");

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchSearch = [item.carrera, item.municipio, item.ces, item.sexo].some((value) =>
        value.toLowerCase().includes(search.toLowerCase())
      );
      const matchFilter = filter === "Todos" || item.sexo === filter;
      return matchSearch && matchFilter;
    });
  }, [items, search, filter]);

  return (
    <section id="plazas" className="mb-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">Plan de Plazas</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Plazas históricas y año en curso</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="block text-sm text-slate-700">
            Filtro sexo
            <select
              className="mt-2 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option>Todos</option>
              <option>M</option>
              <option>F</option>
              <option>Ambos</option>
            </select>
          </label>
          <label className="block text-sm text-slate-700">
            Buscar
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Carrera, municipio, CES"
              className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none"
            />
          </label>
        </div>
      </div>
      <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Carrera</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Municipio</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">CES</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Sexo</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">Plazas</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">Año</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filtered.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="px-4 py-4 text-slate-800">{item.carrera}</td>
                <td className="px-4 py-4 text-slate-800">{item.municipio}</td>
                <td className="px-4 py-4 text-slate-800">{item.ces}</td>
                <td className="px-4 py-4 text-slate-800">{item.sexo}</td>
                <td className="px-4 py-4 text-right font-semibold text-slate-900">{item.plazas}</td>
                <td className="px-4 py-4 text-right text-slate-600">{item.year}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
