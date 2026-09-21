import { useEffect, useState } from "react";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import StageStatusNotice from "../../components/StageStatusNotice/StageStatusNotice";
import { downloadStudentSolicitudPdf, editStudentSolicitud, fetchStudentSolicitud, submitStudentSolicitud } from "../../api/student.service";
import { Card, Select, useConfirm } from "../../components";
import PrimaryButton from "../../components/Buttons/PrimaryButton";
import SecondaryButton from "../../components/Buttons/SecondaryButton";
import styles from "./BoletaSolicitudPage.module.css";

const statusStyles = {
  por_enviar: { label: "Por enviar", className: "statusPorEnviar" },
  pendiente: { label: "Pendiente", className: "statusPendiente" },
  aprobada: { label: "Aprobada", className: "statusAprobada" },
  modificada: { label: "Modificada", className: "statusModificada" },
};

function StatusBadge({ status }) {
  const style = statusStyles[status] || { label: status || "Pendiente", className: "statusPorEnviar" };
  return <span className={`${styles.statusBadge} ${styles[style.className]}`}>{style.label}</span>;
}

export default function BoletaPage() {
  const confirm = useConfirm();
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
      const confirmed = preview.confirmacion_requerida && (await confirm({
        title: "Confirma tu boleta de solicitud",
        message: `Confirma las 10 carreras y su orden de prioridad:\n\n${summary}`,
        confirmLabel: "Confirmar",
      }));
      if (confirmed) {
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

  if (!data) return <Card padding="p-8" className="text-sm text-slate-600">Cargando boleta de solicitud...</Card>;

  const student = data.student;
  const studentInfo = [
    { label: "Nombre", value: `${student.nombre} ${student.apellidos}` },
    { label: "CI", value: student.ci || "-" },
    { label: "Escuela", value: student.escuela || "-" },
    { label: "Municipio", value: student.municipio || "-" },
    { label: "Provincia", value: student.provincia || "-" },
    { label: "Índice general", value: student.indice_general ?? "-" },
  ];

  return (
    <div className="space-y-6">
      <Card padding="p-8">
        <div className={styles.headerRow}>
          <div>
            <p className={styles.eyebrow}>Boleta de Solicitud</p>
            <h1 className={styles.title}>Preferencias de ingreso</h1>
            <p className={styles.subtitle}>Selecciona exactamente 10 plazas de tu provincia y ordénalas por prioridad.</p>
          </div>
          <PrimaryButton onClick={download} disabled={!data.id}>Descargar boleta PDF</PrimaryButton>
        </div>
        {error && <FeedbackMessage type="error" className="mt-6 rounded-2xl">{error}</FeedbackMessage>}
        {message && <FeedbackMessage type="success" className="mt-6 rounded-2xl">{message}</FeedbackMessage>}
        <StageStatusNotice stageNumber={3} />
        <div className={styles.studentInfoGrid}>
          {studentInfo.map((item) => (
            <div key={item.label} className={styles.infoTile}>
              <p className={styles.infoLabel}>{item.label}</p>
              <p className={styles.infoValue}>{item.value}</p>
            </div>
          ))}
        </div>
        <div className={styles.selectionBox}>
          <div className={styles.addRow}>
            <Select value={selectedPlan} onChange={(event) => setSelectedPlan(event.target.value)} disabled={!editing || selected.length === 10} className={styles.addSelect}>
              <option value="">Selecciona una plaza de tu provincia</option>
              {plansToAdd.map((plan) => <option key={plan.id} value={plan.id}>{plan.carrera_nombre} · {plan.ces_nombre}</option>)}
            </Select>
            <PrimaryButton onClick={addPlan} disabled={!selectedPlan || !editing}>+ Agregar</PrimaryButton>
          </div>
          <p className={styles.countHint}>Carreras seleccionadas: {selected.length}/10 · Catálogo provincial: {available.length}</p>
          <div className={styles.planList}>
            {selected.map((planId, index) => {
              const plan = available.find((item) => item.id === planId);
              return (
                <div key={planId} className={styles.planRow}>
                  <span className={styles.planIndex}>{index + 1}</span>
                  <div className={styles.planDetails}>
                    <p className={styles.planCareer}>{plan?.carrera_nombre}</p>
                    <p className={styles.planMeta}>{plan?.ces_nombre} · {plan?.provincia_nombre} · {plan?.cantidad_plazas} plazas</p>
                  </div>
                  {editing && (
                    <div className={styles.planActions}>
                      <button type="button" onClick={() => movePlan(index, -1)} disabled={index === 0} className={styles.iconButton} aria-label="Subir prioridad" title="Subir prioridad">↑</button>
                      <button type="button" onClick={() => movePlan(index, 1)} disabled={index === selected.length - 1} className={styles.iconButton} aria-label="Bajar prioridad" title="Bajar prioridad">↓</button>
                      <button type="button" onClick={() => setSelected((current) => current.filter((id) => id !== planId))} className={styles.removeButton}>Quitar</button>
                    </div>
                  )}
                </div>
              );
            })}
            {!selected.length && <p className={styles.emptyNotice}>Aún no has seleccionado plazas.</p>}
          </div>
          <div className={styles.statusRow}><span>Estado:</span><StatusBadge status={data.estado} /></div>
          <div className={styles.footerRow}>
            {data.estado === "pendiente" && editingMode === null ? (
              <>
                <PrimaryButton onClick={() => { setEditingMode('edit-pending'); }} disabled={!stage.active}>Editar boleta</PrimaryButton>
                <span className={styles.noteSuccess}>Pendiente de aprobación</span>
              </>
            ) : data.estado === "pendiente" && editingMode === 'edit-pending' ? (
              <>
                <PrimaryButton className="!bg-emerald-600 hover:!bg-emerald-700" onClick={send} disabled={!editing || selected.length !== 10}>Enviar boleta</PrimaryButton>
                <SecondaryButton onClick={() => setEditingMode(null)}>Cancelar</SecondaryButton>
              </>
            ) : canRequestModification && editingMode === null ? (
              <>
                <PrimaryButton onClick={() => { setEditingMode('request-modification'); }} disabled={!stage.active}>Solicitar modificación</PrimaryButton>
                <span className={styles.noteWarning}>La modificación será revisada por el Jefe de Comisión.</span>
              </>
            ) : editingMode === 'request-modification' ? (
              <>
                <PrimaryButton className="!bg-emerald-600 hover:!bg-emerald-700" onClick={send} disabled={!editing || selected.length !== 10}>Enviar solicitud de modificación</PrimaryButton>
                <SecondaryButton onClick={() => setEditingMode(null)}>Cancelar</SecondaryButton>
              </>
            ) : modificationPending ? (
              <span className={styles.noteError}>Modificada y pendiente de aprobación del Jefe de Comisión.</span>
            ) : data.estado === "aprobada" ? null : (
              <>
                <PrimaryButton className="!bg-emerald-600 hover:!bg-emerald-700" onClick={send} disabled={!editing || selected.length !== 10}>Enviar boleta</PrimaryButton>
                <span className={styles.noteMuted}>Debes seleccionar las 10 carreras para enviarla.</span>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
