import { useEffect, useState } from "react";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import StageStatusNotice from "../../components/StageStatusNotice/StageStatusNotice";
import { Card } from "../../components";
import { fetchStudentOtorgamiento } from "../../services/api";
import styles from "./OtorgamientoPage.module.css";

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
  if (!data) return <Card padding="p-8" className="text-sm text-slate-600">Cargando otorgamiento...</Card>;

  const award = data.award;
  const awardedCareerQualified = award?.cut_index != null
    && award.award_index >= award.cut_index;
  const awardedPriority = award?.awarded_priority;
  const priorityLabel = awardedPriority === 1 ? "1ra" : awardedPriority === 2 ? "2da" : awardedPriority === 3 ? "3ra" : `${awardedPriority}ta`;
  return (
    <div className="space-y-6">
      <Card padding="p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700">Mi Otorgamiento</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Carrera otorgada</h1>
        <p className="mt-3 text-sm text-slate-600">Resultado final del proceso {data.year}.</p>
        <StageStatusNotice stageNumber={6} />
        {!award ? (
          <div className={styles.pendingBox}>
            <p className={styles.pendingLabel}>Resultado de otorgamiento</p>
            <p className={styles.pendingValue}>Pendiente de publicación</p>
            <p className={styles.pendingHint}>La carrera otorgada aparecerá aquí cuando se publiquen los resultados finales.</p>
          </div>
        ) : (
          <>
            <div className={styles.awardBox}>
              <p className={styles.awardLead}>¡Felicidades! Tu carrera otorgada es</p>
              <h2 className={styles.awardCareer}>{award.career}</h2>
              <p className={styles.awardCes}>{award.ces}</p>
              <p className={styles.awardIndex}>Índice de otorgamiento: {award.award_index}</p>
            </div>
            <div className={styles.summaryBox}>
              <h2 className={styles.summaryTitle}>Resumen completo</h2>
              <div className={styles.summaryGrid}>
                <div className={`${styles.summaryTile} ${styles.summaryTileGeneral}`}>
                  <p className={`${styles.summaryTileLabel} ${styles.summaryTileLabelGeneral}`}>Índice general</p>
                  <p className={styles.summaryTileValue}>{award.general_index ?? "-"}</p>
                </div>
                <div className={`${styles.summaryTile} ${styles.summaryTileAward}`}>
                  <p className={`${styles.summaryTileLabel} ${styles.summaryTileLabelAward}`}>Índice otorgamiento</p>
                  <p className={styles.summaryTileValue}>{award.award_index}</p>
                </div>
                <div className={`${styles.summaryTile} ${styles.summaryTileCut}`}>
                  <p className={`${styles.summaryTileLabel} ${styles.summaryTileLabelCut}`}>Corte carrera</p>
                  <p className={styles.summaryTileValue}>{award.cut_index ?? "-"}</p>
                </div>
              </div>
            </div>
            {awardedPriority && (
              <div className={`${styles.priorityNotice} ${awardedCareerQualified ? styles.priorityNoticeQualified : styles.priorityNoticeUnqualified}`}>
                <span aria-hidden="true">ℹ️</span> Tu índice ({award.award_index}) {awardedCareerQualified ? "superó" : "no alcanzó"} el corte de {award.career} ({award.cut_index ?? "-"}) — accediste por tu {priorityLabel} opción.
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
