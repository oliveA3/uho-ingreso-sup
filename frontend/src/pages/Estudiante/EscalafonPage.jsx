import { useEffect, useState } from "react";
import { fetchEscalafon, submitEscalafonAction } from "../../api/escalafon.service";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import EscalafonTable from "../../components/EscalafonTable/EscalafonTable";
import ReviewModal from "../../components/Modals/ReviewModal";
import StageStatusNotice from "../../components/StageStatusNotice/StageStatusNotice";
import PrimaryButton from "../../components/Buttons/PrimaryButton";
import { Card, StatCard, StatsGrid } from "../../components";
import styles from "./EscalafonPage.module.css";

export default function EstudianteEscalafonPage() {
  const [entries, setEntries] = useState([]);
  const [current, setCurrent] = useState(null);
  const [error, setError] = useState("");
  const [cause, setCause] = useState("");
  const [search, setSearch] = useState("");
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [canRespond, setCanRespond] = useState(false);

  useEffect(() => {
    fetchEscalafon().then((data) => {
      setEntries(data.entries);
      setCanRespond(Boolean(data.puede_responder));
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
    <div className={styles.page}>
      <Card padding="p-6">
        <div>
          <p className={styles.eyebrow}>Mi proceso académico</p>
          <h1 className={styles.title}>Mi Escalafón</h1>
          <p className={styles.subtitle}>Consulta tus notas, tu posición en el escalafón y el estado de validación en el proceso de ingreso.</p>
        </div>

        <StageStatusNotice stageNumber={1} />

        <StatsGrid className={styles.statsGrid}>
          <StatCard label="10mo Grado" value={current?.indice_10 ?? "--"} />
          <StatCard label="11no Grado" value={current?.indice_11 ?? "--"} />
          <StatCard label="12vo Grado" value={current?.indice_12 ?? "--"} />
          <StatCard label="Índice general" value={current?.indice_general ?? "--"} />
        </StatsGrid>

        {error && <FeedbackMessage type="error" className={styles.feedbackMessage}>{error}</FeedbackMessage>}
        {notice && <FeedbackMessage type="success" className={styles.noticeMessage}>{notice}</FeedbackMessage>}

        {current && <div className={styles.escalafonSection}>
          <EscalafonTable entries={entries} current={current} search={search} onSearchChange={(event) => setSearch(event.target.value)} />
          {(current.estado === "por_revisar" || (canRespond && current.estado === "sin_respuesta")) && <div className={styles.reviewBox}>
            {current.estado === "por_revisar" && <FeedbackMessage type="warning" className={styles.reviewPendingMessage}>Tu solicitud de revisión fue enviada.</FeedbackMessage>}
            {canRespond && current.estado === "sin_respuesta" && <>
              <p className={styles.reviewHint}>¿Aceptas tus índices o deseas solicitar una revisión?</p>
              <div className={styles.reviewActions}>
                <PrimaryButton className={styles.acceptButton} onClick={() => act("aceptar")}>Aceptar</PrimaryButton>
                <PrimaryButton className={styles.reviewButton} onClick={() => setReviewModalOpen(true)}>Solicitar revisión</PrimaryButton>
              </div>
            </>}
          </div>}
        </div>}
        {reviewModalOpen && <ReviewModal cause={cause} onCauseChange={(event) => setCause(event.target.value)} onCancel={() => setReviewModalOpen(false)} onSubmit={async () => { if (await act("revision")) setReviewModalOpen(false); }} />}
      </Card>
    </div>
  );
}
