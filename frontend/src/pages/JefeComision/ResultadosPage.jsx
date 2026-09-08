import { useCallback, useEffect, useRef, useState } from "react";
import FeedbackMessage from "../../components/FeedbackMessage";
import { downloadResultsExport, fetchResultClaims, fetchResults, importResults, updateResultClaim } from "../../services/api";
import EntityActionButton from "../../components/Buttons/EntityActionButton";
import SecondaryButton from "../../components/Buttons/SecondaryButton";
import StageStatusNotice from "../../components/StageStatusNotice";

export default function ResultadosPage() {
  const [results, setResults] = useState([]);
  const [claims, setClaims] = useState([]);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [decisionClaim, setDecisionClaim] = useState(null);
  const [presentationDate, setPresentationDate] = useState("");
  const [presentationPlace, setPresentationPlace] = useState("");
  const [decisionId, setDecisionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [stageActive, setStageActive] = useState(false);
  const year = new Date().getFullYear();
  const [subject, setSubject] = useState("Matematica");
  const [deadline, setDeadline] = useState(`${year}-03-05`);
  const fileInput = useRef(null);
  const handleStageStatus = useCallback((status) => {
    setStageActive(status === "en_curso");
  }, []);

  async function load() {
    try {
      const [resultData, claimData] = await Promise.all([fetchResults(year), fetchResultClaims(year)]);
      setResults(resultData);
      setClaims(claimData);
      setError("");
    }
    catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const result = await importResults(file, year, subject, deadline);
      setNotice(`${result.inserted} resultados insertados y ${result.updated} actualizados.`);
      setError("");
      await load();
    } catch (requestError) { setError(requestError.message); }
    finally { event.target.value = ""; }
  }

  async function handleExport() {
    try {
      const blob = await downloadResultsExport(year, subject);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `resultados_${subject.toLowerCase()}_${year}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function resolveClaim(claim, estado, details = {}) {
    try {
      setDecisionId(claim.id);
      await updateResultClaim(claim.id, estado, details);
      setDecisionClaim(null);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDecisionId(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700">Gestión de Resultados</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Importar notas y gestionar reclamaciones</h1>
        </div>

        <StageStatusNotice stageNumber={5} onStatusChange={handleStageStatus} />
        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-700">
              Asignatura
              <select value={subject} onChange={(event) => setSubject(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900">
                <option value="Matematica">Matematica</option>
                <option value="Espanol">Espanol</option>
                <option value="Historia">Historia</option>
              </select>
            </label>
            {stageActive && <label className="space-y-2 text-sm text-slate-700">
              Fecha Límite Reclamaciones
              <input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900" />
            </label>}
          </div>
          {error && <FeedbackMessage type="error" className="mt-4 rounded-xl">{error}</FeedbackMessage>}
          {notice && <FeedbackMessage type="success" className="mt-4 rounded-xl">{notice}</FeedbackMessage>}
          <label className="mt-4 block text-sm font-semibold text-slate-700">
            Archivo Excel de resultados
            <input
              ref={fileInput}
              type="file"
              accept=".xlsx"
              className="hidden"
              disabled={!stageActive}
              onChange={handleImport}
            />
          </label>
          <button type="button" onClick={() => fileInput.current?.click()} disabled={!stageActive} className="mt-4 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">Importar resultados desde Excel</button>
          <button type="button" onClick={handleExport} disabled={!results.length} className="ml-2 mt-4 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Exportar resultados</button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold text-slate-900">Reclamaciones Pendientes</p>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">{claims.filter((claim) => claim.status === "pendiente").length}</span>
        </div>

        <div className="table-scroll mt-6 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 text-left text-slate-700">
                <th className="border-b border-slate-200 px-4 py-3">Estudiante</th>
                <th className="border-b border-slate-200 px-4 py-3">Asignatura</th>
                <th className="border-b border-slate-200 px-4 py-3">Nota</th>
                <th className="border-b border-slate-200 px-4 py-3">Escuela</th>
                {stageActive && <th className="border-b border-slate-200 px-4 py-3">Acción</th>}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={stageActive ? 5 : 4} className="px-4 py-8 text-center text-slate-500">Cargando reclamaciones...</td></tr>}
              {!loading && !claims.length && <tr><td colSpan={stageActive ? 5 : 4} className="px-4 py-8 text-center text-slate-500">No hay reclamaciones recibidas.</td></tr>}
              {claims.map((item) => (
                <tr key={item.id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700">{item.student}</td>
                  <td className="px-4 py-3 text-slate-700">{item.subject}</td>
                  <td className="px-4 py-3 text-slate-700">{item.grade}</td>
                  <td className="px-4 py-3 text-slate-700">{item.school}</td>
                  {stageActive && <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <SecondaryButton className="px-3 py-2 text-xs" onClick={() => setSelectedClaim(item)}>Ver detalles</SecondaryButton>
                      {item.status === "pendiente" && <>
                        <EntityActionButton variant="edit" className="px-3 py-2 text-xs" onClick={() => { setDecisionClaim(item); setPresentationDate(""); setPresentationPlace(""); }} disabled={decisionId === item.id}>Aceptar</EntityActionButton>
                        <EntityActionButton variant="delete" className="px-3 py-2 text-xs" onClick={() => resolveClaim(item, "rechazada")} disabled={decisionId === item.id}>Rechazar</EntityActionButton>
                      </>}
                      {item.status !== "pendiente" && <span className="self-center text-xs font-semibold text-slate-500">{item.status === "aprobada" ? "Aceptada" : "Rechazada"}</span>}
                    </div>
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {selectedClaim && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setSelectedClaim(null)}>
        <div role="dialog" aria-modal="true" aria-labelledby="claim-detail-title" className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Detalle de reclamación</p><h2 id="claim-detail-title" className="mt-1 text-xl font-semibold text-slate-900">{selectedClaim.student}</h2></div><button type="button" onClick={() => setSelectedClaim(null)} className="rounded-xl px-3 py-1 text-xl text-slate-500" aria-label="Cerrar">&times;</button></div>
          <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 sm:grid-cols-2"><p><span className="font-semibold">Asignatura:</span> {selectedClaim.subject}</p><p><span className="font-semibold">Nota:</span> {selectedClaim.grade}</p><p><span className="font-semibold">Escuela:</span> {selectedClaim.school}</p><p><span className="font-semibold">Estado:</span> {selectedClaim.status}</p></div>
          <div className="mt-5 rounded-2xl border border-slate-200 p-4"><p className="text-sm font-semibold text-slate-700">Razón de la reclamación</p><p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{selectedClaim.description}</p></div>
          <div className="mt-5 flex justify-end"><SecondaryButton onClick={() => setSelectedClaim(null)}>Cerrar</SecondaryButton></div>
        </div>
      </div>}
      {decisionClaim && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setDecisionClaim(null)}>
        <form role="dialog" aria-modal="true" aria-labelledby="decision-modal-title" className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); resolveClaim(decisionClaim, "aprobada", { fecha_presentacion: presentationDate, lugar_presentacion: presentationPlace }); }}>
          <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Aceptar reclamación</p><h2 id="decision-modal-title" className="mt-1 text-xl font-semibold text-slate-900">Datos de presentación</h2></div><button type="button" onClick={() => setDecisionClaim(null)} className="rounded-xl px-3 py-1 text-xl text-slate-500" aria-label="Cerrar">&times;</button></div>
          <p className="mt-4 text-sm text-slate-600">Indica cuándo y dónde debe presentarse {decisionClaim.student} para revisar la nota.</p>
          <label className="mt-5 block text-sm font-semibold text-slate-700">Día y hora
            <input type="datetime-local" value={presentationDate} onChange={(event) => setPresentationDate(event.target.value)} required className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 font-normal text-slate-900" />
          </label>
          <label className="mt-4 block text-sm font-semibold text-slate-700">Lugar de presentación
            <input value={presentationPlace} onChange={(event) => setPresentationPlace(event.target.value)} required maxLength={150} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 font-normal text-slate-900" placeholder="Ej. Comisión de Ingreso Provincial" />
          </label>
          <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setDecisionClaim(null)} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancelar</button><button type="submit" disabled={decisionId === decisionClaim.id} className="rounded-2xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{decisionId === decisionClaim.id ? "Guardando..." : "Aceptar y notificar"}</button></div>
        </form>
      </div>}
    </div>
  );
}
