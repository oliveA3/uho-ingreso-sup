import { useEffect, useState } from "react";
import { fetchLandingResults } from "../../services/api";

const emptyFilters = { anio: new Date().getFullYear(), provincia: "", municipio: "", escuela: "", asignatura: "" };

export default function ResultadosModal({ onClose }) {
  const [filters, setFilters] = useState(emptyFilters);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchLandingResults(filters)
      .then((nextData) => { if (active) { setData(nextData); setError(""); } })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters]);

  function changeFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: field === "anio" ? Number(value) : value }));
  }

  const options = {
    anio: data?.years || [new Date().getFullYear()],
    provincia: data?.provinces || [],
    municipio: data?.municipalities || [],
    escuela: data?.schools || [],
    asignatura: data?.subjects || [],
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-4" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="resultados-landing-title" className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-2xl sm:p-5" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-700">Notas de ingreso</p><h2 id="resultados-landing-title" className="mt-1 text-xl font-bold text-sky-900">Resultados de las pruebas</h2></div>
          <button type="button" onClick={onClose} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">Cerrar</button>
        </div>

        <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {["anio", "provincia", "municipio", "escuela", "asignatura"].map((field) => (
            <label key={field} className="text-xs font-medium text-slate-700"><span className="mb-1 block">{field === "anio" ? "Año" : field === "provincia" ? "Provincia" : field === "municipio" ? "Municipio" : field === "escuela" ? "Escuela" : "Asignatura"}</span>
              <select value={filters[field]} onChange={(event) => changeFilter(field, event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-sky-500">
                {field !== "anio" && <option value="">Todos</option>}
                {options[field].map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
          ))}
        </div>

        {error && <p className="mb-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        <div className="max-h-[360px] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          {loading ? <p className="px-4 py-10 text-center text-sm text-slate-500">Cargando resultados...</p> : !data?.results?.length ? <p className="px-4 py-10 text-center text-sm text-slate-500">No hay notas para los filtros seleccionados.</p> : (
            <table className="min-w-full border-separate border-spacing-0 text-left">
              <thead className="sticky top-0 z-10 bg-sky-800 text-white"><tr><th className="px-3 py-2 text-xs font-semibold">Estudiante</th><th className="px-3 py-2 text-xs font-semibold">Asignatura</th><th className="px-3 py-2 text-xs font-semibold">Nota</th><th className="px-3 py-2 text-xs font-semibold">Escuela</th><th className="px-3 py-2 text-xs font-semibold">Municipio</th><th className="px-3 py-2 text-xs font-semibold">Provincia</th></tr></thead>
              <tbody>{data.results.map((item) => <tr key={item.id} className="border-b border-slate-200 bg-white even:bg-slate-50"><td className="px-3 py-2.5 text-sm font-medium text-slate-800">{item.student}</td><td className="px-3 py-2.5 text-sm text-slate-700">{item.subject}</td><td className="px-3 py-2.5 text-sm font-semibold text-slate-800">{item.grade}</td><td className="px-3 py-2.5 text-sm text-slate-700">{item.school}</td><td className="px-3 py-2.5 text-sm text-slate-700">{item.municipality}</td><td className="px-3 py-2.5 text-sm text-slate-700">{item.province}</td></tr>)}</tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
