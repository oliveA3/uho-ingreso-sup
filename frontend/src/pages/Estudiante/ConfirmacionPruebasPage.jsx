import { useEffect, useState } from "react";
import FeedbackMessage from "../../components/FeedbackMessage";
import EntityActionButton from "../../components/Buttons/EntityActionButton";
import { fetchStudentExamConfirmations, updateStudentExamConfirmation } from "../../services/api";

const dateFormatter = new Intl.DateTimeFormat("es-CU", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});
const dayFormatter = new Intl.DateTimeFormat("es-CU", { day: "numeric", month: "short" });

const getExamStatus = (exam) => exam.status || (exam.confirmed === null ? "pending" : exam.confirmed ? "confirmed" : "absent");

export default function EstudianteConfirmacionPruebasPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  const loadData = async () => {
    try {
      setData(await fetchStudentExamConfirmations());
      setError(null);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  useEffect(() => { loadData(); }, []);

  const respond = async (id, confirmed) => {
    try {
      setProcessingId(id);
      await updateStudentExamConfirmation(id, confirmed);
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setProcessingId(null);
    }
  };

  if (error && !data) return <FeedbackMessage type="error" className="rounded-2xl">{error}</FeedbackMessage>;
  if (!data) return <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">Cargando pruebas de ingreso...</div>;

  const stageActive = data.stage?.active;
  const formattedDates = data.exams.map((exam) => dayFormatter.format(new Date(exam.date))).join(", ");
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3">
            <div><p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700">Pruebas de Ingreso</p><h1 className="mt-2 text-3xl font-semibold text-slate-900">Confirmación de Pruebas de Ingreso</h1><p className="mt-2 text-sm text-slate-600">{stageActive ? "Confirma tu presentación en cada prueba." : "La etapa de confirmación no está activa. Puedes consultar tus pruebas, pero ya no modificar tu respuesta."}</p></div>
        </div>
        <p className="mt-2 text-sm text-slate-600"></p>
        {error && <FeedbackMessage type="error" className="mt-5 rounded-2xl">{error}</FeedbackMessage>}
          <div className="space-y-3 mt-6">
          {data.exams.length ? data.exams.map((exam) => (
            <div key={exam.id} className={`rounded-3xl border bg-white p-5 shadow-sm ${getExamStatus(exam) === "confirmed" ? "border-emerald-200" : getExamStatus(exam) === "absent" ? "border-rose-200" : "border-slate-200"}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-base font-bold text-slate-900">{exam.subject === "Matemática" ? "📐" : exam.subject === "Español" ? "📖" : "🗺️"} {exam.subject}</p>
                  <p className="mt-1 text-sm text-slate-700">{dateFormatter.format(new Date(exam.date))} · Aula por confirmar</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  {getExamStatus(exam) !== "pending" && <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getExamStatus(exam) === "confirmed" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{getExamStatus(exam) === "confirmed" ? "Confirmado" : "No asistiré"}</span>}
                  <EntityActionButton variant="edit" onClick={() => respond(exam.id, true)} disabled={!stageActive || processingId === exam.id}>Confirmar</EntityActionButton>
                  <EntityActionButton variant="delete" onClick={() => respond(exam.id, false)} disabled={!stageActive || processingId === exam.id}>No asistiré</EntityActionButton>
                </div>
              </div>
            </div>
          )) : <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">Aún no hay pruebas disponibles para confirmar.</p>}
          </div>
      </section>
    </div>
  );
}
