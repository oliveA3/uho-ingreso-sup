import { useEffect, useState } from "react";
import FeedbackMessage from "../../components/FeedbackMessage";
import StageStatusNotice from "../../components/StageStatusNotice";
import { fetchResults, submitStudentResultClaim } from "../../services/api";

function isClaimDeadlineExpired(deadline) {
  if (!deadline) return false;
  const today = new Date();
  const todayValue = [today.getFullYear(), today.getMonth() + 1, today.getDate()]
    .map((value, index) => index === 0 ? value : String(value).padStart(2, "0"))
    .join("-");
  return deadline < todayValue;
}

export default function ResultadosPage() {
  const [resultados, setResultados] = useState([]);
  const [stage, setStage] = useState(null);
  const [error, setError] = useState("");
  const [claimingId, setClaimingId] = useState(null);
  const [claimModal, setClaimModal] = useState(null);
  const [acceptedClaim, setAcceptedClaim] = useState(null);
  const [claimDescription, setClaimDescription] = useState("");

  useEffect(() => {
    fetchResults()
      .then((data) => {
        setResultados(data.results || []);
        setStage(data.stage || null);
      })
      .catch((requestError) => setError(requestError.message));
  }, []);

  async function handleClaim(result) {
    if (!claimDescription.trim()) return;
    try {
      setClaimingId(result.id);
      await submitStudentResultClaim(result.id, claimDescription.trim());
      const data = await fetchResults();
      setResultados(data.results || []);
      setStage(data.stage || null);
      setError("");
      setClaimModal(null);
      setClaimDescription("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setClaimingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">📊 Resultados</h1>
            <p className="mt-2 text-sm text-slate-600">Consulta tus notas publicadas y el estado de tus reclamaciones.</p>
          </div>
        </div>

        <StageStatusNotice stageNumber={5} />

        {error && <FeedbackMessage type="error" className="mt-6 rounded-xl">{error}</FeedbackMessage>}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {resultados.map((item) => <article key={item.subject} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">{item.subject}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{item.grade ?? "-"}</p>
            <p className="mt-1 text-sm text-slate-600">{item.grade == null ? "Pendiente de publicación" : "Nota publicada"}</p>
          </article>)}
        </div>

        <div className="mt-6 space-y-3">
          {resultados.map((item) => <div key={item.subject} className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-slate-900">{item.subject} {item.grade != null && <span className="text-emerald-700">{item.grade} pts</span>}</p>
              <p className="mt-1 text-sm text-slate-600">{item.fecha_limite_reclamo ? `Plazo hasta el ${item.fecha_limite_reclamo}.` : item.grade == null ? "Aún no hay nota publicada." : "Sin plazo de reclamación definido."}</p>
            </div>
            {item.claim ? <div className="flex flex-wrap items-center gap-2"> <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.claim.status === "aprobada" ? "bg-emerald-100 text-emerald-700" : item.claim.status === "rechazada" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>{item.claim.status === "aprobada" ? "Reclamación aceptada" : item.claim.status === "rechazada" ? "Reclamación rechazada" : "Reclamación enviada"}</span>{item.claim.status === "aprobada" && <button type="button" onClick={() => setAcceptedClaim(item.claim)} className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Ver detalles</button>}</div> : stage?.active && item.grade != null && <button type="button" onClick={() => { setClaimModal(item); setClaimDescription(""); }} disabled={isClaimDeadlineExpired(item.fecha_limite_reclamo)} className="rounded-2xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50">{isClaimDeadlineExpired(item.fecha_limite_reclamo) ? "Plazo vencido" : "Reclamar"}</button>}
          </div>)}
          {!resultados.length && <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">Aún no hay resultados publicados.</p>}
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700">
          Los resultados se actualizan automáticamente cuando el proceso avanza. Verifica tu estado con frecuencia.
        </div>
      </section>
      {claimModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setClaimModal(null)}>
        <form role="dialog" aria-modal="true" aria-labelledby="claim-modal-title" onSubmit={(event) => { event.preventDefault(); handleClaim(claimModal); }} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Reclamación de nota</p><h2 id="claim-modal-title" className="mt-1 text-xl font-semibold text-slate-900">{claimModal.subject}</h2></div>
            <button type="button" onClick={() => setClaimModal(null)} className="rounded-xl px-3 py-1 text-xl text-slate-500" aria-label="Cerrar">&times;</button>
          </div>
          <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 sm:grid-cols-2">
            <p><span className="font-semibold">Nota obtenida:</span> {claimModal.grade}</p>
            <p><span className="font-semibold">Plazo:</span> {claimModal.fecha_limite_reclamo || "No definido"}</p>
          </div>
          <label className="mt-5 block text-sm font-semibold text-slate-700">Razón de la reclamación
            <textarea value={claimDescription} onChange={(event) => setClaimDescription(event.target.value)} maxLength={500} required rows={5} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 font-normal text-slate-900" placeholder="Explica por qué solicitas revisar esta nota." />
          </label>
          <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setClaimModal(null)} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancelar</button><button type="submit" disabled={!claimDescription.trim() || claimingId === claimModal.id} className="rounded-2xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{claimingId === claimModal.id ? "Enviando..." : "Enviar reclamación"}</button></div>
        </form>
      </div>}
      {acceptedClaim && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setAcceptedClaim(null)}>
        <div role="dialog" aria-modal="true" aria-labelledby="accepted-claim-title" className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Reclamación aceptada</p><h2 id="accepted-claim-title" className="mt-1 text-xl font-semibold text-slate-900">Presentación para revisión</h2></div><button type="button" onClick={() => setAcceptedClaim(null)} className="rounded-xl px-3 py-1 text-xl text-slate-500" aria-label="Cerrar">&times;</button></div>
          <div className="mt-5 space-y-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700"><p><span className="font-semibold">Razón:</span> {acceptedClaim.description}</p><p><span className="font-semibold">Día y hora:</span> {acceptedClaim.fecha_presentacion ? new Date(acceptedClaim.fecha_presentacion).toLocaleString("es-CU") : "No definido"}</p><p><span className="font-semibold">Lugar:</span> {acceptedClaim.lugar_presentacion || "No definido"}</p></div>
          <div className="mt-5 flex justify-end"><button type="button" onClick={() => setAcceptedClaim(null)} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cerrar</button></div>
        </div>
      </div>}
    </div>
  );
}
