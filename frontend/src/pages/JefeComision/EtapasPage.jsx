import { useEffect, useState } from "react";
import {
  activateProvincialEtapa,
  closeProvincialEtapa,
  fetchProvincialEtapas,
  resetProvincialEtapas,
} from "../../services/api";

const statusLabels = {
  completada: "Completada",
  en_curso: "En Curso",
  no_iniciada: "No Iniciada",
  bloqueada: "Bloqueada",
};

const statusStyles = {
  completada: "bg-emerald-100 text-emerald-700",
  en_curso: "bg-sky-100 text-sky-700",
  no_iniciada: "bg-slate-100 text-slate-700",
  bloqueada: "bg-slate-100 text-slate-500",
};

function formatDates(stage) {
  if (!stage.fecha_inicio) return null;
  return `${stage.fecha_inicio} - ${stage.fecha_fin}`;
}

export default function EtapasPage() {
  const [etapas, setEtapas] = useState([]);
  const [dates, setDates] = useState({ fecha_inicio: "", fecha_fin: "" });
  const [selectedStage, setSelectedStage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadEtapas() {
    setLoading(true);
    try {
      setEtapas(await fetchProvincialEtapas());
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadEtapas(); }, []);

  function openActivation(stage) {
    setSelectedStage(stage);
    setDates({ fecha_inicio: "", fecha_fin: "" });
    setError("");
  }

  async function handleActivation(event) {
    event.preventDefault();
    if (dates.fecha_fin < dates.fecha_inicio) {
      setError("La fecha de fin debe ser posterior o igual a la fecha de inicio.");
      return;
    }
    setSaving(true);
    try {
      await activateProvincialEtapa(selectedStage.id, dates);
      setSelectedStage(null);
      setNotice("Etapa activada correctamente.");
      await loadEtapas();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleClose(stage) {
    setSaving(true);
    try {
      await closeProvincialEtapa(stage.id);
      setNotice("Etapa cerrada correctamente.");
      await loadEtapas();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!window.confirm("¿Deseas reiniciar el ciclo de etapas? Se borrarán todas las fechas.")) return;
    setSaving(true);
    try {
      await resetProvincialEtapas();
      setNotice("El ciclo de etapas fue reiniciado.");
      await loadEtapas();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  const allCompleted = etapas.length > 0 && etapas.every((stage) => stage.estado === "completada");

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700">Control de Etapas</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Activación secuencial del proceso</h1>
          <p className="mt-3 text-sm text-slate-600">Solo se puede activar la etapa inmediata después de la última en curso o completada.</p>
        </div>

        {notice && <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-700">{notice}</div>}
        {error && <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>}

        <div className="mt-6 space-y-4">
          {loading && <p className="text-sm text-slate-600">Cargando etapas...</p>}
          {!loading && etapas.map((stage) => {
            const status = stage.estado;
            return (
            <div key={stage.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-900">Etapa {stage.numero} — {stage.nombre}</p>
                  {formatDates(stage) && <p className="text-sm text-slate-600">{formatDates(stage)}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[status]}`}>{statusLabels[status]}</span>
                  {status === "en_curso" ? (
                    <button type="button" onClick={() => handleClose(stage)} disabled={saving} className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">Cerrar</button>
                  ) : status === "no_iniciada" ? (
                    <button type="button" onClick={() => openActivation(stage)} className="rounded-2xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white">Activar</button>
                  ) : null}
                </div>
              </div>
            </div>
            );
          })}
        </div>
        {!loading && allCompleted && (
          <button type="button" onClick={handleReset} disabled={saving} className="mt-6 rounded-2xl bg-amber-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            Reiniciar ciclo
          </button>
        )}
      </section>
      {selectedStage && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-slate-900/40 p-4">
          <form onSubmit={handleActivation} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-slate-900">Activar etapa {selectedStage.numero}</h2>
            {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">Fecha de inicio<input required type="date" value={dates.fecha_inicio} onChange={(event) => { setDates({ ...dates, fecha_inicio: event.target.value }); setError(""); }} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium text-slate-700">Fecha de fin<input required type="date" min={dates.fecha_inicio || undefined} value={dates.fecha_fin} onChange={(event) => { setDates({ ...dates, fecha_fin: event.target.value }); setError(""); }} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setSelectedStage(null)} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancelar</button>
              <button type="submit" disabled={saving} className="rounded-2xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Guardando..." : "Confirmar"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
