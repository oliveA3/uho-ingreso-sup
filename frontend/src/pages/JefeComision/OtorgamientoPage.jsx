import { useCallback, useEffect, useRef, useState } from "react";
import StageStatusNotice from "../../components/StageStatusNotice";
import FeedbackMessage from "../../components/FeedbackMessage";
import { downloadStageSixExport, fetchOtorgamientoSummary, importCortesCarrera, importOtorgamientos } from "../../services/api";

export default function OtorgamientoPage() {
  const [stageActive, setStageActive] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [importing, setImporting] = useState("");
  const [summary, setSummary] = useState({ awarded_count: 0, without_award_count: 0, cuts_count: 0 });
  const year = new Date().getFullYear();
  const otorgamientoInput = useRef(null);
  const corteInput = useRef(null);
  const handleStageStatus = useCallback((status) => {
    setStageActive(status === "en_curso");
  }, []);

  async function loadSummary() {
    try {
      setSummary(await fetchOtorgamientoSummary(year));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  useEffect(() => { loadSummary(); }, []);

  async function handleImport(event, type) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setImporting(type);
      const result = type === "otorgamientos"
        ? await importOtorgamientos(file)
        : await importCortesCarrera(file);
      setNotice(`${result.inserted} insertados y ${result.updated} actualizados.`);
      setError("");
      await loadSummary();
    } catch (requestError) {
      setError(requestError.message);
      setNotice("");
    } finally {
      setImporting("");
      event.target.value = "";
    }
  }

  async function handleExport(kind) {
    try {
      const blob = await downloadStageSixExport(kind, year);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${kind}_${year}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700">Otorgamiento de Carreras</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Importar otorgamientos y cortes</h1>
          <p className="mt-3 text-sm text-slate-600">Carga exámenes, otorgamientos y valores de corte de carrera para publicar los resultados finales.</p>
        </div>

        <StageStatusNotice stageNumber={6} onStatusChange={handleStageStatus} />
        {error && <FeedbackMessage type="error" className="mt-5 rounded-xl">{error}</FeedbackMessage>}
        {notice && <FeedbackMessage type="success" className="mt-5 rounded-xl">{notice}</FeedbackMessage>}

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-sm font-semibold text-slate-900">Importar Otorgamientos</p>
            <p className="mt-2 text-sm text-slate-600">Carga un archivo Excel con CI, código de carrera, nombre y índice.</p>
            <input ref={otorgamientoInput} type="file" accept=".xlsx" className="hidden" disabled={!stageActive} onChange={(event) => handleImport(event, "otorgamientos")} />
            <div className="mt-4 grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => otorgamientoInput.current?.click()} disabled={!stageActive || importing === "otorgamientos"} className="min-w-0 rounded-2xl bg-slate-900 px-3 py-3 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">{importing === "otorgamientos" ? "Importando..." : "Importar Otorgamientos"}</button><button type="button" onClick={() => handleExport("otorgamientos")} className="min-w-0 rounded-2xl border border-slate-300 bg-white px-3 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">Exportar Otorgamientos</button></div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-sm font-semibold text-slate-900">Importar Índices de Corte</p>
            <p className="mt-2 text-sm text-slate-600">Carga datos de corte para que el sistema publique resultados.</p>
            <input ref={corteInput} type="file" accept=".xlsx" className="hidden" disabled={!stageActive} onChange={(event) => handleImport(event, "cortes")} />
            <div className="mt-4 grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => corteInput.current?.click()} disabled={!stageActive || importing === "cortes"} className="min-w-0 rounded-2xl bg-slate-900 px-3 py-3 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">{importing === "cortes" ? "Importando..." : "Importar Índices"}</button><button type="button" onClick={() => handleExport("cortes")} className="min-w-0 rounded-2xl border border-slate-300 bg-white px-3 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">Exportar Índices</button></div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Resumen</p>
            <p className="text-sm text-slate-600">Carreras y estudiantes con otorgamiento publicado.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-emerald-50 p-6 text-center">
            <p className="text-sm text-slate-600">Carreras Otorgadas</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{summary.awarded_count ?? 0}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-amber-50 p-6 text-center">
            <p className="text-sm text-slate-600">Sin Otorgamiento</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{summary.without_award_count ?? 0}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-sky-50 p-6 text-center">
            <p className="text-sm text-slate-600">Índices de Corte</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{summary.cuts_count ?? 0}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
