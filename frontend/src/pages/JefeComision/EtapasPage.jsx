import { useEffect, useState } from "react";
import {
  activateProvincialEtapa,
  closeProvincialEtapa,
  fetchProvincialEtapas,
  resetProvincialEtapas,
} from "../../services/api";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import PrimaryButton from "../../components/Buttons/PrimaryButton";
import SecondaryButton from "../../components/Buttons/SecondaryButton";
import { Card, FormField, Input, Modal, useConfirm } from "../../components";
import styles from "./EtapasPage.module.css";

const statusLabels = {
  completada: "Completada",
  en_curso: "En Curso",
  no_iniciada: "No Iniciada",
  bloqueada: "Bloqueada",
};

const statusStyles = {
  completada: "statusCompletada",
  en_curso: "statusEnCurso",
  no_iniciada: "statusNoIniciada",
  bloqueada: "statusBloqueada",
};

function formatDates(stage) {
  if (!stage.fecha_inicio) return null;
  return `${stage.fecha_inicio} - ${stage.fecha_fin}`;
}

export default function EtapasPage() {
  const confirm = useConfirm();
  const [etapas, setEtapas] = useState([]);
  const [dates, setDates] = useState({ fecha_inicio: "", fecha_fin: "" });
  const [examDates, setExamDates] = useState({ fecha_matematica: "", fecha_espanol: "", fecha_historia: "" });
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
    setExamDates({ fecha_matematica: "", fecha_espanol: "", fecha_historia: "" });
    setError("");
  }

  async function handleActivation(event) {
    event.preventDefault();
    if (dates.fecha_fin < dates.fecha_inicio) {
      setError("La fecha de fin debe ser posterior o igual a la fecha de inicio.");
      return;
    }
    if (selectedStage.numero === 4 && Object.values(examDates).some((date) => !date)) {
      setError("Indica las fechas de Matemática, Español e Historia.");
      return;
    }
    setSaving(true);
    try {
      await activateProvincialEtapa(selectedStage.id, { ...dates, ...(selectedStage.numero === 4 ? examDates : {}) });
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
    const ok = await confirm({
      title: "Reiniciar ciclo de etapas",
      message: "¿Deseas reiniciar el ciclo de etapas? Se borrarán todas las fechas.",
      confirmLabel: "Reiniciar",
      tone: "danger",
    });
    if (!ok) return;
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
    <div className={styles.page}>
      <Card padding="p-8">
        <div>
          <p className={styles.eyebrow}>Control de Etapas</p>
          <h1 className={styles.title}>Activación secuencial del proceso</h1>
          <p className={styles.description}>Solo se puede activar la etapa inmediata después de la última en curso o completada.</p>
        </div>

        {notice && <FeedbackMessage type="success" className={styles.notice}>{notice}</FeedbackMessage>}
        {error && <FeedbackMessage type="error" className={styles.notice}>{error}</FeedbackMessage>}

        <div className={styles.stageList}>
          {loading && <p className={styles.stageDates}>Cargando etapas...</p>}
          {!loading && etapas.map((stage) => {
            const status = stage.estado;
            return (
            <div key={stage.id} className={styles.stageCard}>
              <div className={styles.stageRow}>
                <div>
                  <p className={styles.stageName}>Etapa {stage.numero} — {stage.nombre}</p>
                  {formatDates(stage) && <p className={styles.stageDates}>{formatDates(stage)}</p>}
                </div>
                <div className={styles.stageActions}>
                  <span className={styles[statusStyles[status]]}>{statusLabels[status]}</span>
                  {status === "en_curso" ? (
                    <PrimaryButton className={styles.closeButton} onClick={() => handleClose(stage)} disabled={saving}>Cerrar</PrimaryButton>
                  ) : status === "no_iniciada" ? (
                    <PrimaryButton className={styles.stageButton} onClick={() => openActivation(stage)}>Activar</PrimaryButton>
                  ) : null}
                </div>
              </div>
            </div>
            );
          })}
        </div>
        {!loading && allCompleted && (
          <PrimaryButton className={styles.resetButton} onClick={handleReset} disabled={saving}>
            Reiniciar ciclo
          </PrimaryButton>
        )}
      </Card>
      <Modal
        open={Boolean(selectedStage)}
        onClose={() => setSelectedStage(null)}
        title={selectedStage ? `Activar etapa ${selectedStage.numero}` : ""}
        footer={
          <>
            <SecondaryButton onClick={() => setSelectedStage(null)}>Cancelar</SecondaryButton>
            <PrimaryButton disabled={saving} type="submit" form="etapa-activacion-form">{saving ? "Guardando..." : "Confirmar"}</PrimaryButton>
          </>
        }
      >
        {selectedStage && (
          <form id="etapa-activacion-form" onSubmit={handleActivation}>
            {error && <FeedbackMessage type="error" className={styles.formError}>{error}</FeedbackMessage>}
            <div className={styles.activationGrid}>
              <FormField label="Fecha de inicio">
                <Input required type="date" value={dates.fecha_inicio} onChange={(event) => { setDates({ ...dates, fecha_inicio: event.target.value }); setError(""); }} />
              </FormField>
              <FormField label="Fecha de fin">
                <Input required type="date" min={dates.fecha_inicio || undefined} value={dates.fecha_fin} onChange={(event) => { setDates({ ...dates, fecha_fin: event.target.value }); setError(""); }} />
              </FormField>
            </div>
            {selectedStage.numero === 4 && (
              <div className={styles.examGrid}>
                <FormField label="Matemática">
                  <Input required type="date" min={dates.fecha_inicio || undefined} max={dates.fecha_fin || undefined} value={examDates.fecha_matematica} onChange={(event) => { setExamDates({ ...examDates, fecha_matematica: event.target.value }); setError(""); }} />
                </FormField>
                <FormField label="Español">
                  <Input required type="date" min={dates.fecha_inicio || undefined} max={dates.fecha_fin || undefined} value={examDates.fecha_espanol} onChange={(event) => { setExamDates({ ...examDates, fecha_espanol: event.target.value }); setError(""); }} />
                </FormField>
                <FormField label="Historia">
                  <Input required type="date" min={dates.fecha_inicio || undefined} max={dates.fecha_fin || undefined} value={examDates.fecha_historia} onChange={(event) => { setExamDates({ ...examDates, fecha_historia: event.target.value }); setError(""); }} />
                </FormField>
              </div>
            )}
          </form>
        )}
      </Modal>
    </div>
  );
}
