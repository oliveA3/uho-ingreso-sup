import { useEffect, useState } from "react";
import FeedbackMessage from "../../components/FeedbackMessage";
import StageStatusNotice from "../../components/StageStatusNotice";
import { downloadStudentSolicitudPdf, editStudentSolicitud, fetchStudentSolicitud, submitStudentSolicitud } from "../../services/api";

const statusStyles = {
  por_enviar: { label: "Por enviar", className: "bg-slate-100 text-slate-700" },
  pendiente: { label: "Pendiente", className: "bg-amber-100 text-amber-700" },
  aprobada: { label: "Aprobada", className: "bg-emerald-100 text-emerald-700" },
  modificada: { label: "Modificada", className: "bg-rose-100 text-rose-700" },
};

function StatusBadge({ status }) {
  const style = statusStyles[status] || { label: status || "Pendiente", className: "bg-slate-100 text-slate-700" };
  return <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${style.className}`}>{style.label}</span>;
}

export default function BoletaPage() {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [editingMode, setEditingMode] = useState(null); // null, 'edit-pending', 'request-modification'

  const refresh = async () => {
    const result = await fetchStudentSolicitud();
    setData(result);
    setSelected((result.items || []).sort((first, second) => first.prioridad - second.prioridad).map((item) => item.plan_plaza));
    setEditingMode(null);
  };

  useEffect(() => { refresh().catch((requestError) => setError(requestError.message)); }, []);

  const update = async (action) => {
    setError(null);
    setMessage(null);
    try {
      await action();
      await refresh();
      setSelectedPlan("");
    } catch (requestError) { setError(requestError.message); }
  };

  const stage = data?.stage || { active: data?.stage_active };
  const available = data?.available_plans || [];
  const canRequestModification = stage?.permite_modificacion && data?.estado === "aprobada";
  const isEditingMode = editingMode !== null;
  const editing = Boolean(stage?.active) && (["por_enviar", "pendiente", "modificada"].includes(data?.estado) || isEditingMode);
  const modificationPending = data?.estado === "modificada";
  const plansToAdd = available.filter((plan) => !selected.includes(plan.id));

  const addPlan = () => {
    if (!selectedPlan || selected.length >= 10) return;
    setSelected((current) => [...current, Number(selectedPlan)]);
    setSelectedPlan("");
  };

  const movePlan = (index, direction) => setSelected((current) => {
    const target = index + direction;
    if (target < 0 || target >= current.length) return current;
    const next = [...current];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });

  const send = async () => {
    setError(null);
    setMessage(null);
    try {
      // If requesting modification, first transition ballot state from aprobada -> modificada
      if (editingMode === 'request-modification') {
        await editStudentSolicitud();
      }
      
      const preview = await submitStudentSolicitud(selected);
      const summary = selected.map((planId, index) => {
        const plan = available.find((item) => item.id === planId);
        return `${index + 1}. ${plan?.carrera_nombre || "Carrera no disponible"} (${plan?.ces_nombre || ""})`;
      }).join("\n");
      if (preview.confirmacion_requerida && window.confirm(`Confirma las 10 carreras y su orden de prioridad:\n\n${summary}`)) {
        await submitStudentSolicitud(selected, true);
        await refresh();
        if (editingMode === 'request-modification') {
          setMessage("Solicitud de modificación enviada.");
        } else {
          setMessage("Boleta enviada y pendiente de aprobación del Secretario.");
        }
      }
    } catch (requestError) { setError(requestError.message); }
  };

  const download = async () => {
    try {
      const blob = await downloadStudentSolicitudPdf();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "boleta-solicitud.pdf";
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) { setError(requestError.message); }
  };

  if (!data) return <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">Cargando boleta de solicitud...</div>;

  const student = data.student;
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div><p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700">Boleta de Solicitud</p><h1 className="mt-2 text-3xl font-semibold text-slate-900">Preferencias de ingreso</h1><p className="mt-2 text-sm text-slate-600">Selecciona exactamente 10 plazas de tu provincia y ordénalas por prioridad.</p></div>
          <button type="button" onClick={download} disabled={!data.id} className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">Descargar boleta PDF</button>
        </div>
        {error && <FeedbackMessage type="error" className="mt-6 rounded-2xl">{error}</FeedbackMessage>}
        {message && <FeedbackMessage type="success" className="mt-6 rounded-2xl">{message}</FeedbackMessage>}
        <StageStatusNotice stageNumber={3} />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[{ label: "Nombre", value: `${student.nombre} ${student.apellidos}` }, { label: "CI", value: student.ci || "-" }, { label: "Escuela", value: student.escuela || "-" }, { label: "Municipio", value: student.municipio || "-" }, { label: "Provincia", value: student.provincia || "-" }, { label: "Índice general", value: student.indice_general ?? "-" }].map((item) => <div key={item.label} className="rounded-3xl border border-slate-200 bg-slate-50 p-5"><p className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.label}</p><p className="mt-2 text-sm font-semibold text-slate-900">{item.value}</p></div>)}
        </div>
        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700">
          <div className="flex flex-col gap-3 sm:flex-row"><select value={selectedPlan} onChange={(event) => setSelectedPlan(event.target.value)} disabled={!editing || selected.length === 10} className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"><option value="">Selecciona una plaza de tu provincia</option>{plansToAdd.map((plan) => <option key={plan.id} value={plan.id}>{plan.carrera_nombre} · {plan.ces_nombre}</option>)}</select><button type="button" onClick={addPlan} disabled={!selectedPlan || !editing} className="rounded-2xl bg-sky-600 px-4 py-2 font-semibold text-white disabled:opacity-50">+ Agregar</button></div>
          <p className="mt-4 text-xs text-slate-500">Carreras seleccionadas: {selected.length}/10 · Catálogo provincial: {available.length}</p>
          <div className="mt-4 space-y-3">{selected.map((planId, index) => { const plan = available.find((item) => item.id === planId); return <div key={planId} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 font-semibold text-sky-700">{index + 1}</span><div className="min-w-0 flex-1"><p className="font-semibold text-slate-900">{plan?.carrera_nombre}</p><p className="text-xs text-slate-500">{plan?.ces_nombre} · {plan?.provincia_nombre} · {plan?.cantidad_plazas} plazas</p></div>{editing && <div className="flex shrink-0 items-center gap-1"><button type="button" onClick={() => movePlan(index, -1)} disabled={index === 0} className="rounded-xl px-2 py-2 text-lg text-slate-500 disabled:opacity-30" aria-label="Subir prioridad" title="Subir prioridad">↑</button><button type="button" onClick={() => movePlan(index, 1)} disabled={index === selected.length - 1} className="rounded-xl px-2 py-2 text-lg text-slate-500 disabled:opacity-30" aria-label="Bajar prioridad" title="Bajar prioridad">↓</button><button type="button" onClick={() => setSelected((current) => current.filter((id) => id !== planId))} className="rounded-xl px-3 py-2 font-semibold text-rose-600">Quitar</button></div>}</div>; })}{!selected.length && <p className="py-5 text-center text-slate-500">Aún no has seleccionado plazas.</p>}</div>
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500"><span>Estado:</span><StatusBadge status={data.estado} /></div>
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-5">
            {data.estado === "pendiente" && editingMode === null ? (
              <>
                <button type="button" onClick={() => { setEditingMode('edit-pending'); }} disabled={!stage.active} className="rounded-2xl bg-sky-600 px-4 py-3 font-semibold text-white disabled:opacity-50">Editar boleta</button>
                <span className="text-sm font-semibold text-emerald-700">Pendiente de aprobación</span>
              </>
            ) : data.estado === "pendiente" && editingMode === 'edit-pending' ? (
              <>
                <button type="button" onClick={send} disabled={!editing || selected.length !== 10} className="rounded-2xl bg-emerald-600 px-4 py-3 font-semibold text-white disabled:opacity-50">Enviar boleta</button>
                <button type="button" onClick={() => setEditingMode(null)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-slate-700">Cancelar</button>
              </>
            ) : canRequestModification && editingMode === null ? (
              <>
                <button type="button" onClick={() => { setEditingMode('request-modification'); }} disabled={!stage.active} className="rounded-2xl bg-sky-600 px-4 py-3 font-semibold text-white disabled:opacity-50">Solicitar modificación</button>
                <span className="text-sm font-semibold text-amber-700">La modificación será revisada por el Jefe de Comisión.</span>
              </>
            ) : editingMode === 'request-modification' ? (
              <>
                <button type="button" onClick={send} disabled={!editing || selected.length !== 10} className="rounded-2xl bg-emerald-600 px-4 py-3 font-semibold text-white disabled:opacity-50">Enviar solicitud de modificación</button>
                <button type="button" onClick={() => setEditingMode(null)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-slate-700">Cancelar</button>
              </>
            ) : modificationPending ? (
              <span className="text-sm font-semibold text-rose-700">Modificada y pendiente de aprobación del Jefe de Comisión.</span>
            ) : data.estado === "aprobada" ? null : (
              <>
                <button type="button" onClick={send} disabled={!editing || selected.length !== 10} className="rounded-2xl bg-emerald-600 px-4 py-3 font-semibold text-white disabled:opacity-50">Enviar boleta</button>
                <span className="text-sm text-slate-500">Debes seleccionar las 10 carreras para enviarla.</span>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
