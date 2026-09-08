import { useEffect, useState } from "react";
import { fetchLandingCortes, fetchLandingOtorgamientos } from "../../services/api";

const initialFilters = { anio: new Date().getFullYear(), provincia: "", ci: "", carrera: "" };

export default function OtorgamientosModal({ onClose, mode = "otorgamientos" }) {
  const [filters, setFilters] = useState(initialFilters);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    (mode === "cortes" ? fetchLandingCortes(filters) : fetchLandingOtorgamientos(filters))
      .then((nextData) => { if (active) { setData(nextData); setError(""); } })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters, mode]);

  useEffect(() => {
    if (mode === "cortes" && data?.year && filters.anio !== data.year) {
      setFilters((current) => ({ ...current, anio: data.year }));
    }
  }, [data, filters.anio, mode]);

  function changeFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: field === "anio" ? Number(value) : value }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-4" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="otorgamientos-landing-title" className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-2xl sm:p-5" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-700">{mode === "cortes" ? "Índices de corte" : "Otorgamiento de carreras"}</p><h2 id="otorgamientos-landing-title" className="mt-1 text-xl font-bold text-sky-900">{mode === "cortes" ? `Cortes más solicitados${data?.year ? ` (${data.year})` : ""}` : "Otorgamientos publicados"}</h2></div>
          <button type="button" onClick={onClose} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">Cerrar</button>
        </div>
        {<div className="mb-4 grid gap-2 sm:grid-cols-3">
          <label className="text-xs font-medium text-slate-700"><span className="mb-1 block">Año</span><select value={filters.anio} onChange={(event) => changeFilter("anio", event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-sky-500">{(data?.years || [new Date().getFullYear()]).map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
          <label className="text-xs font-medium text-slate-700"><span className="mb-1 block">Provincia</span><select value={filters.provincia} onChange={(event) => changeFilter("provincia", event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-sky-500"><option value="">Todas</option>{(data?.provinces || []).map((province) => <option key={province} value={province}>{province}</option>)}</select></label>
          {mode === "cortes" ? <label className="text-xs font-medium text-slate-700"><span className="mb-1 block">Buscar carrera</span><input value={filters.carrera} onChange={(event) => changeFilter("carrera", event.target.value)} placeholder="Nombre de carrera" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-sky-500" /></label> : <label className="text-xs font-medium text-slate-700"><span className="mb-1 block">Buscar por CI</span><input value={filters.ci} onChange={(event) => changeFilter("ci", event.target.value)} inputMode="numeric" placeholder="11 dígitos" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-sky-500" /></label>}
        </div>}
        {error && <p className="mb-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        <div className="max-h-[360px] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          {loading ? <p className="px-4 py-10 text-center text-sm text-slate-500">Cargando información...</p> : mode === "cortes" ? (!data?.items?.length ? <p className="px-4 py-10 text-center text-sm text-slate-500">No hay índices de corte disponibles.</p> : <table className="min-w-full border-separate border-spacing-0 text-left"><thead className="sticky top-0 z-10 bg-sky-800 text-white"><tr><th className="px-3 py-2 text-xs font-semibold">Carrera</th><th className="px-3 py-2 text-xs font-semibold">Código</th><th className="px-3 py-2 text-xs font-semibold">Índice de corte</th><th className="px-3 py-2 text-xs font-semibold">Solicitudes</th></tr></thead><tbody>{data.items.map((item) => <tr key={item.id} className="border-b border-slate-200 bg-white even:bg-slate-50"><td className="px-3 py-2.5 text-sm font-medium text-slate-800">{item.career}</td><td className="px-3 py-2.5 text-sm text-slate-700">{item.career_code}</td><td className="px-3 py-2.5 text-sm font-semibold text-slate-800">{item.index}</td><td className="px-3 py-2.5 text-sm text-slate-700">{item.requests_count}</td></tr>)}</tbody></table>) : (!data?.results?.length ? <p className="px-4 py-10 text-center text-sm text-slate-500">No hay otorgamientos para los filtros seleccionados.</p> : <table className="min-w-full border-separate border-spacing-0 text-left"><thead className="sticky top-0 z-10 bg-sky-800 text-white"><tr><th className="px-3 py-2 text-xs font-semibold">Estudiante</th><th className="px-3 py-2 text-xs font-semibold">CI</th><th className="px-3 py-2 text-xs font-semibold">Carrera</th><th className="px-3 py-2 text-xs font-semibold">CES</th><th className="px-3 py-2 text-xs font-semibold">Índice</th><th className="px-3 py-2 text-xs font-semibold">Provincia</th></tr></thead><tbody>{data.results.map((item) => <tr key={item.id} className="border-b border-slate-200 bg-white even:bg-slate-50"><td className="px-3 py-2.5 text-sm font-medium text-slate-800">{item.student}</td><td className="px-3 py-2.5 text-sm text-slate-700">{item.ci}</td><td className="px-3 py-2.5 text-sm text-slate-700">{item.career}</td><td className="px-3 py-2.5 text-sm text-slate-700">{item.ces}</td><td className="px-3 py-2.5 text-sm font-semibold text-slate-800">{item.award_index}</td><td className="px-3 py-2.5 text-sm text-slate-700">{item.province}</td></tr>)}</tbody></table>)}
        </div>
      </section>
    </div>
  );
}
