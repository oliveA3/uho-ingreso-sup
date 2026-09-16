import { useEffect, useState } from "react";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import EntityActionButton from "../../components/Buttons/EntityActionButton";
import StageStatusNotice from "../../components/StageStatusNotice/StageStatusNotice";
import { Card } from "../../components";
import { fetchStudentExamConfirmations, updateStudentExamConfirmation } from "../../services/api";
import styles from "./ConfirmacionPruebasPage.module.css";

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
  if (!data) return <Card padding="p-8" className="text-sm text-slate-600">Cargando pruebas de ingreso...</Card>;

  const stageActive = data.stage?.active;
  return (
    <div className="space-y-6">
      <Card padding="p-8">
        <div className={styles.headerBlock}>
          <div>
            <p className={styles.eyebrow}>Pruebas de Ingreso</p>
            <h1 className={styles.title}>Confirmación de Pruebas de Ingreso</h1>
            <p className={styles.subtitle}>{stageActive ? "Confirma tu presentación en cada prueba." : "La etapa de confirmación no está activa. Puedes consultar tus pruebas, pero ya no modificar tu respuesta."}</p>
          </div>
        </div>
        <StageStatusNotice stageNumber={4} />
        {error && <FeedbackMessage type="error" className="mt-5 rounded-2xl">{error}</FeedbackMessage>}
        <div className={styles.examList}>
          {data.exams.length ? data.exams.map((exam) => (
            <div key={exam.id} className={styles.examRow}>
              <div className={styles.examRowInner}>
                <div>
                  <p className={styles.examSubject}>{exam.subject === "Matemática" ? "📐" : exam.subject === "Español" ? "📖" : "🗺️"} {exam.subject}</p>
                  <p className={styles.examDate}>{dateFormatter.format(new Date(exam.date))}</p>
                </div>
                <div className={styles.examActions}>
                  {getExamStatus(exam) !== "pending" && (
                    <span className={`${styles.examBadge} ${getExamStatus(exam) === "confirmed" ? styles.examBadgeConfirmed : styles.examBadgeAbsent}`}>
                      {getExamStatus(exam) === "confirmed" ? "Confirmado" : "No asistiré"}
                    </span>
                  )}
                  {stageActive && <>
                    <EntityActionButton variant="edit" onClick={() => respond(exam.id, true)} disabled={processingId === exam.id}>Confirmar</EntityActionButton>
                    <EntityActionButton variant="delete" onClick={() => respond(exam.id, false)} disabled={processingId === exam.id}>No asistiré</EntityActionButton>
                  </>}
                </div>
              </div>
            </div>
          )) : <p className={styles.emptyNotice}>Aún no hay pruebas disponibles para confirmar.</p>}
        </div>
      </Card>
    </div>
  );
}
