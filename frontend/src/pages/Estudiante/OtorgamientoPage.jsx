import { useEffect, useState } from "react";
import FeedbackMessage from "../../components/FeedbackMessage";
import StageStatusNotice from "../../components/StageStatusNotice";
import { fetchStudentOtorgamiento } from "../../services/api";

export default function EstudianteOtorgamientoPage() {
  const year = new Date().getFullYear();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStudentOtorgamiento(year)
      .then(setData)
      .catch((requestError) => setError(requestError.message));
  }, [year]);

  if (error && !data) return <FeedbackMessage type="error" className="rounded-2xl">{error}</FeedbackMessage>;
  if (!data) return <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">Cargando otorgamiento...</div>;

  const award = data.award;
  const awardedCareerQualified = award?.cut_index != null
    && award.award_index >= award.cut_index;
  const awardedPriority = award?.awarded_priority;
  const priorityLabel = awardedPriority === 1 ? "1ra" : awardedPriority === 2 ? "2da" : awardedPriority === 3 ? "3ra" : `${awardedPriority}ta`;
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700">Mi Otorgamiento</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Carrera otorgada</h1>
        <p className="mt-3 text-sm text-slate-600">Resultado final del proceso {data.year}.</p>
        <StageStatusNotice stageNumber={6} />
        {!award ? <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6"><p className="text-sm text-slate-600">Resultado de otorgamiento</p><p className="mt-2 text-2xl font-semibold text-slate-900">Pendiente de publicación</p><p className="mt-2 text-sm text-slate-600">La carrera otorgada aparecerá aquí cuando se publiquen los resultados finales.</p></div> : <>
          <div className="mt-6 rounded-3xl bg-emerald-600 p-6 text-center text-white shadow-sm"><p className="text-sm font-semibold">¡Felicidades! Tu carrera otorgada es</p><h2 className="mt-2 text-2xl font-bold">{award.career}</h2><p className="mt-1 text-base text-emerald-50">{award.ces}</p><p className="mt-4 text-xl font-semibold">Índice de otorgamiento: {award.award_index}</p></div>
          <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5"><h2 className="text-base font-semibold text-slate-900">Resumen completo</h2><div className="mt-3 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-sky-100 p-3"><p className="text-xs font-semibold uppercase text-sky-700">Índice general</p><p className="mt-1 text-xl font-semibold text-slate-900">{award.general_index ?? "-"}</p></div><div className="rounded-2xl bg-emerald-100 p-3"><p className="text-xs font-semibold uppercase text-emerald-700">Índice otorgamiento</p><p className="mt-1 text-xl font-semibold text-slate-900">{award.award_index}</p></div><div className="rounded-2xl bg-amber-100 p-3"><p className="text-xs font-semibold uppercase text-amber-700">Corte carrera</p><p className="mt-1 text-xl font-semibold text-slate-900">{award.cut_index ?? "-"}</p></div></div></div>
          {awardedPriority && <div className={`mt-4 rounded-2xl px-4 py-3 text-sm ${awardedCareerQualified ? "border-sky-600 bg-sky-50 text-sky-800" : "border-amber-500 bg-amber-50 text-amber-800"}`}><span aria-hidden="true">ℹ️</span> Tu índice ({award.award_index}) {awardedCareerQualified ? "superó" : "no alcanzó"} el corte de {award.career} ({award.cut_index ?? "-"}) — accediste por tu {priorityLabel} opción.</div>}
        </>}
      </section>
    </div>
  );
}
