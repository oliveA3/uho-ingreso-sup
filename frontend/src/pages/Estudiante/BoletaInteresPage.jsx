import { useEffect, useState } from "react";
import FeedbackMessage from "../../components/FeedbackMessage";
import {
  addStudentInterestCareer,
  editStudentInterest,
  fetchStudentInterest,
  removeStudentInterestCareer,
  reorderStudentInterestCareer,
  sendStudentInterest,
} from "../../services/api";

export default function EstudianteBoletaInteresPage() {
  const [ballot, setBallot] = useState(null);
  const [selectedCareer, setSelectedCareer] = useState("");
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const loadBallot = () => fetchStudentInterest().then(setBallot).catch((requestError) => setError(requestError.message));

  useEffect(() => {
    loadBallot();
  }, []);

  const update = async (action) => {
    setError(null);
    setMessage(null);
    try {
      await action();
      await loadBallot();
      setSelectedCareer("");
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const reopenBallot = () => update(editStudentInterest);

  if (!ballot) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">Cargando boleta de interés...</div>;
  }

  const editing = ballot.stage.active && !ballot.enviada;
  const selectedIds = new Set(ballot.items.map((item) => item.carrera));
  const careersToAdd = ballot.available_careers.filter((career) => !selectedIds.has(career.id));
  const deadline = ballot.stage.fecha_fin ? new Date(`${ballot.stage.fecha_fin}T00:00:00`).toLocaleDateString("es-CU") : "sin fecha definida";

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700">Boleta de Interés</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Carreras de interés</h1>
        <p className="mt-3 text-sm text-slate-600">Selecciona hasta 10 carreras en orden de prioridad para el proceso {new Date(ballot.proceso).getFullYear()}.</p>
        {error && <FeedbackMessage type="error" className="mt-6 rounded-2xl">{error}</FeedbackMessage>}
        {message && <FeedbackMessage type="success" className="mt-6 rounded-2xl">{message}</FeedbackMessage>}
        <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          {ballot.stage.active ? <><strong>{ballot.stage.dias_restantes ?? "-"} días restantes.</strong> Puedes editar hasta el {deadline}.</> : "La etapa de boleta de interés no está activa."}
        </div>
        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Mis preferencias <span className="ml-2 rounded-full bg-sky-100 px-3 py-1 text-sm text-sky-700">{ballot.items.length} / 10</span></h2>
            <div className="flex w-full gap-2 sm:w-auto">
              <select value={selectedCareer} onChange={(event) => setSelectedCareer(event.target.value)} disabled={!editing || !careersToAdd.length} className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 sm:w-72">
                <option value="">Selecciona una carrera</option>
                {careersToAdd.map((career) => <option key={career.id} value={career.id}>{career.nombre} · {career.ces_nombre}</option>)}
              </select>
              <button type="button" disabled={!selectedCareer || !editing} onClick={() => update(() => addStudentInterestCareer(Number(selectedCareer)))} className="rounded-2xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">+ Agregar</button>
            </div>
          </div>
          {!careersToAdd.length && editing && <p className="mt-3 text-sm text-amber-700">No quedan más carreras activas disponibles para agregar.</p>}
          {careersToAdd.length < 10 - ballot.items.length && editing && <p className="mt-3 text-sm text-slate-500">Hay {ballot.available_careers.length} carreras activas en el catálogo. Para enviar la boleta necesitas tener 10 carreras disponibles.</p>}
          <div className="mt-5 space-y-3">
            {ballot.items.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 font-semibold text-sky-700">{item.prioridad}</span>
              <div className="min-w-0 flex-1"><p className="font-semibold text-slate-900">{item.carrera_nombre}</p><p className="text-sm text-slate-500">{item.ces_nombre} · {item.provincia_nombre}</p></div>
              {editing && <div className="flex shrink-0 items-center gap-1">
                <button type="button" disabled={item.prioridad === 1} onClick={() => update(() => reorderStudentInterestCareer(item.id, "up"))} className="rounded-xl px-2 py-2 text-lg text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30" aria-label="Subir prioridad" title="Subir prioridad">↑</button>
                <button type="button" disabled={item.prioridad === ballot.items.length} onClick={() => update(() => reorderStudentInterestCareer(item.id, "down"))} className="rounded-xl px-2 py-2 text-lg text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30" aria-label="Bajar prioridad" title="Bajar prioridad">↓</button>
                <button type="button" onClick={() => update(() => removeStudentInterestCareer(item.id))} className="rounded-xl px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50">Quitar</button>
              </div>}
            </div>)}
            {!ballot.items.length && <p className="py-5 text-center text-sm text-slate-500">Aún no has seleccionado carreras.</p>}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-5">
            {ballot.enviada ? (
              <button type="button" disabled={!ballot.stage.active} onClick={reopenBallot} className="rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Editar</button>
            ) : (
              <button type="button" disabled={!editing || ballot.items.length !== 10} onClick={() => update(async () => { await sendStudentInterest(); setMessage("Tu boleta fue enviada correctamente."); })} className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Enviar boleta</button>
            )}
            {ballot.enviada && <span className="text-sm font-semibold text-emerald-700">Boleta enviada el {ballot.fecha_enviada}</span>}
            {!ballot.enviada && <span className="text-sm text-slate-500">Debes seleccionar las 10 carreras para enviarla.</span>}
          </div>
        </div>
      </section>
    </div>
  );
}
