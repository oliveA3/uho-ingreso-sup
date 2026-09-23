import { useEffect, useState } from "react";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import {
  addStudentInterestCareer,
  editStudentInterest,
  fetchStudentInterest,
  removeStudentInterestCareer,
  reorderStudentInterestCareer,
  sendStudentInterest,
  downloadStudentInterestExcel,
  downloadStudentInterestPdf,
} from "../../api/student.service";
import StageStatusNotice from "../../components/StageStatusNotice/StageStatusNotice";
import CareerPreferenceList from "../../components/CareerPreferenceList/CareerPreferenceList";
import PrimaryButton from "../../components/Buttons/PrimaryButton";
import SecondaryButton from "../../components/Buttons/SecondaryButton";
import { Card, Select } from "../../components";
import styles from "./BoletaInteresPage.module.css";

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

  const download = async () => {
    try {
      const blob = await downloadStudentInterestPdf();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "boleta-interes.pdf";
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const downloadExcel = async () => {
    try {
      const blob = await downloadStudentInterestExcel();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "boleta-interes.xlsx";
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  if (!ballot) {
    return <Card padding="p-8" className="text-sm text-slate-600">Cargando boleta de interés...</Card>;
  }

  const editing = ballot.puede_editar;
  const maxItems = ballot.max_items;
  const selectedIds = new Set(ballot.items.map((item) => item.carrera));
  const careersToAdd = ballot.available_careers.filter((career) => !selectedIds.has(career.id));
  return (
    <div className="space-y-6">
      <Card padding="p-8">
        <p className={styles.eyebrow}>Boleta de Interés</p>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Carreras de interés</h1>
            <p className={styles.subtitle}>Selecciona hasta {maxItems} carreras en orden de prioridad para el proceso {new Date(ballot.proceso).getFullYear()}.</p>
          </div>
          <div className={styles.exportActions}>
            <PrimaryButton onClick={download} disabled={!ballot.items.length}>Descargar PDF</PrimaryButton>
            <SecondaryButton onClick={downloadExcel} disabled={!ballot.items.length}>Descargar Excel</SecondaryButton>
          </div>
        </div>
        <StageStatusNotice stageNumber={2} />
        {error && <FeedbackMessage type="error" className="mt-6 rounded-2xl">{error}</FeedbackMessage>}
        {message && <FeedbackMessage type="success" className="mt-6 rounded-2xl">{message}</FeedbackMessage>}
        <div className={styles.preferencesBox}>
          <div className={styles.preferencesHeader}>
            <h2 className={styles.preferencesTitle}>Mis preferencias <span className={styles.preferencesCount}>{ballot.items.length} / {maxItems}</span></h2>
            <div className={styles.addRow}>
              <Select value={selectedCareer} onChange={(event) => setSelectedCareer(event.target.value)} disabled={!editing || !careersToAdd.length} className={styles.addSelect}>
                <option value="">Selecciona una carrera</option>
                {careersToAdd.map((career) => <option key={career.id} value={career.id}>{career.nombre} · {career.ces_nombre}</option>)}
              </Select>
              <PrimaryButton disabled={!selectedCareer || !editing} onClick={() => update(() => addStudentInterestCareer(Number(selectedCareer)))}>+ Agregar</PrimaryButton>
            </div>
          </div>
          {!careersToAdd.length && editing && <p className={styles.warningHint}>No quedan más carreras activas disponibles para agregar.</p>}
          {careersToAdd.length < maxItems - ballot.items.length && editing && <p className={styles.infoHint}>Hay {ballot.available_careers.length} carreras activas en el catálogo. Para enviar la boleta necesitas tener {maxItems} carreras disponibles.</p>}
          <div className={styles.listWrapper}>
            <CareerPreferenceList
              items={ballot.items}
              renderActions={(item) => editing && <div className={styles.itemActions}>
                <button type="button" disabled={item.prioridad === 1} onClick={() => update(() => reorderStudentInterestCareer(item.id, "up"))} className={styles.iconButton} aria-label="Subir prioridad" title="Subir prioridad">↑</button>
                <button type="button" disabled={item.prioridad === ballot.items.length} onClick={() => update(() => reorderStudentInterestCareer(item.id, "down"))} className={styles.iconButton} aria-label="Bajar prioridad" title="Bajar prioridad">↓</button>
                <button type="button" onClick={() => update(() => removeStudentInterestCareer(item.id))} className={styles.removeButton}>Quitar</button>
              </div>}
            />
            {!ballot.items.length && <p className={styles.emptyNotice}>Aún no has seleccionado carreras.</p>}
          </div>
          <div className={styles.footerRow}>
            {ballot.enviada ? (
              <PrimaryButton disabled={!ballot.stage.active} onClick={reopenBallot}>Editar</PrimaryButton>
            ) : (
              <PrimaryButton className="!bg-brand-success hover:!brightness-90" disabled={!editing || ballot.items.length !== maxItems} onClick={() => update(async () => { await sendStudentInterest(); setMessage("Tu boleta fue enviada correctamente."); })}>Enviar boleta</PrimaryButton>
            )}
            {ballot.enviada && <span className={styles.sentNote}>Boleta enviada el {ballot.fecha_enviada}</span>}
            {!ballot.enviada && <span className={styles.pendingNote}>Debes seleccionar las {maxItems} carreras para enviarla.</span>}
          </div>
        </div>
      </Card>
    </div>
  );
}
