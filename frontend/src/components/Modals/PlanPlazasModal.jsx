import { useEffect, useMemo, useState } from "react";
import { downloadPlanPlazaExport } from "../../services/api";

export default function PlanPlazasModal({ items = [], years = [], defaultProvince = "Todos", onClose }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Todos");
  const [selectedYear, setSelectedYear] = useState(years[0] || new Date().getFullYear());
  const [selectedProvince, setSelectedProvince] = useState(defaultProvince === "Todas" ? "Todos" : (defaultProvince || "Todos"));
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (years.length && !years.includes(selectedYear)) setSelectedYear(years[0]);
  }, [years, selectedYear]);

  useEffect(() => {
    if (defaultProvince === "Todas" || defaultProvince === "Todos") setSelectedProvince("Todos");
    else if (defaultProvince) setSelectedProvince(defaultProvince);
  }, [defaultProvince]);

  const normalizedItems = useMemo(() =>
    items.map((item, index) => ({
      id: item.id ?? index,
      carrera: item.nombre_carrera ?? item.carrera_nombre ?? item.carrera ?? "Sin carrera",
      provincia: item.provincia ?? item.provincia_nombre ?? "—",
      ces: item.ces_nombre ?? item.ces ?? "—",
      sexo: item.sexo ?? "A",
      plazas: item.cantidad_plazas ?? item.plazas ?? 0,
      year: item.year ?? item.anio ?? new Date().getFullYear(),
      tipo: item.otorgamiento_tipo
        ? item.otorgamiento_tipo.charAt(0).toUpperCase() + item.otorgamiento_tipo.slice(1)
        : "Municipal",
    })),
  [items]);

  const availableYears = useMemo(() =>
    Array.from(new Set(years.length ? years : normalizedItems.map((item) => item.year))).sort((a, b) => b - a),
  [years, normalizedItems]);

  const availableProvinces = useMemo(() =>
    Array.from(new Set(normalizedItems.map((item) => item.provincia).filter(Boolean))).sort(),
  [normalizedItems]);

  const filtered = useMemo(() => normalizedItems.filter((item) => {
    const matchYear = String(item.year) === String(selectedYear);
    const matchProvince = selectedProvince === "Todos" || item.provincia === selectedProvince;
    const matchSearch = [item.carrera, item.provincia, item.ces, item.sexo].some((value) =>
      String(value ?? "").toLowerCase().includes(search.toLowerCase())
    );
    const matchFilter = filter === "Todos" || item.sexo === filter;
    return matchYear && matchProvince && matchSearch && matchFilter;
  }), [normalizedItems, selectedYear, selectedProvince, search, filter]);

  const handleDownload = async () => {
    try {
      setExporting(true);
      const blob = await downloadPlanPlazaExport({
        anio: selectedYear,
        provincia: selectedProvince === "Todos" ? "" : selectedProvince,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `plan_plazas_${(selectedProvince === "Todos" ? "todos" : selectedProvince).replace(/[^a-zA-Z0-9]+/g, "_").toLowerCase()}_${selectedYear}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(error.message || "No se pudo descargar el Excel.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-4" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-plazas-title"
        className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-2xl sm:p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-700">Plan de Plazas</p>
            <h2 id="plan-plazas-title" className="mt-1 text-xl font-bold text-sky-900">
              {selectedYear ? `Plan de Plazas ${selectedYear}` : "Plan de Plazas"}
              {selectedProvince && selectedProvince !== "Todos" ? ` - ${selectedProvince}` : ""}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
            Cerrar
          </button>
        </div>

        <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-medium text-slate-700">
            <span className="mb-1 block">Buscar</span>
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Carrera, provincia, CES" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-sky-500" />
          </label>
          <label className="text-xs font-medium text-slate-700">
            <span className="mb-1 block">Año</span>
            <select value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-sky-500">
              {availableYears.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-700">
            <span className="mb-1 block">Provincia</span>
            <select value={selectedProvince} onChange={(event) => setSelectedProvince(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-sky-500">
              <option value="Todos">Todas</option>
              {availableProvinces.map((province) => <option key={province} value={province}>{province}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-700">
            <span className="mb-1 block">Sexo</span>
            <select value={filter} onChange={(event) => setFilter(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-sky-500">
              <option value="Todos">Todos</option>
              <option value="M">M</option>
              <option value="F">F</option>
              <option value="A">A</option>
            </select>
          </label>
        </div>

        <div className="mb-3 flex justify-end">
          <button type="button" onClick={handleDownload} disabled={exporting || normalizedItems.length === 0} className="rounded-lg bg-sky-700 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-300">
            {exporting ? "Descargando..." : "Descargar Excel"}
          </button>
        </div>

        <div className="max-h-[270px] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          {filtered.length === 0 ? (
            <div className="px-4 py-10 text-center text-xs text-slate-500">No hay planes de plazas para los filtros seleccionados.</div>
          ) : (
            <table className="min-w-full border-separate border-spacing-0 text-left">
              <thead className="sticky top-0 z-10 bg-sky-800 text-white">
                <tr>
                  <th className="px-3 py-2 text-xs font-semibold">Carrera</th>
                  <th className="px-3 py-2 text-xs font-semibold">Plazas</th>
                  <th className="px-3 py-2 text-xs font-semibold">Tipo</th>
                  <th className="px-3 py-2 text-xs font-semibold">CES</th>
                  <th className="px-3 py-2 text-xs font-semibold">Sexo</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-b border-slate-200 bg-white even:bg-slate-50">
                    <td className="px-3 py-2.5 text-sm font-medium text-slate-800">{item.carrera}</td>
                    <td className="px-3 py-2.5 text-sm text-slate-700">{item.plazas}</td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.tipo === "Municipal" ? "bg-sky-100 text-sky-800" : "bg-amber-100 text-amber-800"}`}>{item.tipo}</span>
                    </td>
                    <td className="px-3 py-2.5 text-sm text-slate-700">{item.ces}</td>
                    <td className="px-3 py-2.5 text-sm text-slate-700">{item.sexo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
