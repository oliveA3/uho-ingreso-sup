import { useCallback, useEffect, useState } from "react";
import { fetchEscalafon, submitEscalafonAction } from "../../services/api";
import FeedbackMessage from "../../components/FeedbackMessage";
import EscalafonTable from "../../components/EscalafonTable";
import ReviewModal from "../../components/Modals/ReviewModal";
import StageStatusNotice from "../../components/StageStatusNotice";

export default function EstudianteEscalafonPage() {
  const [entries, setEntries] = useState([]);
  const [current, setCurrent] = useState(null);
  const [error, setError] = useState("");
  const [cause, setCause] = useState("");
  const [search, setSearch] = useState("");
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [stageActive, setStageActive] = useState(false);
  const handleStageStatus = useCallback((status) => {
    setStageActive(status === "en_curso");
  }, []);

  useEffect(() => {
    fetchEscalafon().then((data) => {
      setEntries(data.entries);
      setCurrent(data.entries.find((entry) => entry.id === data.actual_id) || null);
    }).catch((requestError) => setError(requestError.message));
  }, []);

  async function act(action) {
    try {
      const result = await submitEscalafonAction(action, cause);
      setCurrent(result);
      setEntries((items) => items.map((entry) => entry.id === result.id ? result : entry));
      setCause("");
      if (action === "aceptar") setNotice("Notas en el escalafón aceptadas.");
      return true;
    } catch (requestError) { setError(requestError.message); return false; }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700">Mi proceso académico</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">Mi Escalafón</h1>
            <p className="mt-1 text-sm text-slate-600">Consulta tus notas, tu posición en el escalafón y el estado de validación en el proceso de ingreso.</p>
        </div>

        <StageStatusNotice stageNumber={1} onStatusChange={handleStageStatus} />

        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-600">10mo Grado</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{current?.indice_10 ?? "--"}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-600">11no Grado</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{current?.indice_11 ?? "--"}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-600">12vo Grado</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{current?.indice_12 ?? "--"}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-600">Índice general</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{current?.indice_general ?? "--"}</p>
          </div>
        </div>

        {error && <FeedbackMessage type="error" className="mt-6 rounded-2xl">{error}</FeedbackMessage>}
        {notice && <FeedbackMessage type="success" className="mt-3 rounded-2xl">{notice}</FeedbackMessage>}
        
        {current && <div className="mt-6 space-y-4">
          <EscalafonTable entries={entries} current={current} search={search} onSearchChange={(event) => setSearch(event.target.value)} />
          {stageActive && (current.estado === "por_revisar" || current.estado === "sin_respuesta") && <div className="rounded-2xl border border-slate-200 p-4">
            {current.estado === "por_revisar" && <FeedbackMessage type="warning" className="mt-2 rounded-xl">Tu solicitud de revisión fue enviada.</FeedbackMessage>}
            {current.estado === "sin_respuesta" && <>
              <p className="text-sm text-slate-600">¿Aceptas tus índices o deseas solicitar una revisión?</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => act("aceptar")} disabled={current.estado_escalafon === "enviado"} className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Aceptar</button>
                <button type="button" onClick={() => setReviewModalOpen(true)} disabled={current.estado_escalafon === "enviado"} className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Solicitar revisión</button>
                {current.estado_escalafon === "enviado" && <p className="w-full text-xs text-slate-500">El escalafón fue enviado a la Comisión y solo está disponible para consulta.</p>}
              </div>
            </>}
          </div>}
        </div>}
        {reviewModalOpen && <ReviewModal cause={cause} onCauseChange={(event) => setCause(event.target.value)} onCancel={() => setReviewModalOpen(false)} onSubmit={async () => { if (await act("revision")) setReviewModalOpen(false); }} />}
      </section>
    </div>
  );
}
