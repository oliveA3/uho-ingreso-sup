import { useEffect, useState } from "react";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import StageStatusNotice from "../../components/StageStatusNotice/StageStatusNotice";
import PrimaryButton from "../../components/Buttons/PrimaryButton";
import SecondaryButton from "../../components/Buttons/SecondaryButton";
import { Card, FormField, Modal, StatCard, StatsGrid, TextArea } from "../../components";
import { fetchResults, submitStudentResultClaim } from "../../api/results.service";
import styles from "./ResultadosPage.module.css";

export default function ResultadosPage() {
  const [resultados, setResultados] = useState([]);
  const [stage, setStage] = useState(null);
  const [error, setError] = useState("");
  const [claimingId, setClaimingId] = useState(null);
  const [claimModal, setClaimModal] = useState(null);
  const [acceptedClaim, setAcceptedClaim] = useState(null);
  const [claimDescription, setClaimDescription] = useState("");

  useEffect(() => {
    fetchResults()
      .then((data) => {
        setResultados(data.results || []);
        setStage(data.stage || null);
      })
      .catch((requestError) => setError(requestError.message));
  }, []);

  async function handleClaim(result) {
    if (!claimDescription.trim()) return;
    try {
      setClaimingId(result.id);
      await submitStudentResultClaim(result.id, claimDescription.trim());
      const data = await fetchResults();
      setResultados(data.results || []);
      setStage(data.stage || null);
      setError("");
      setClaimModal(null);
      setClaimDescription("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setClaimingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card padding="p-8">
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>📊 Resultados</h1>
            <p className={styles.subtitle}>Consulta tus notas publicadas y el estado de tus reclamaciones.</p>
          </div>
        </div>

        <StageStatusNotice stageNumber={5} />

        {error && <FeedbackMessage type="error" className="mt-6 rounded-xl">{error}</FeedbackMessage>}
        <StatsGrid className="mt-6">
          {resultados.map((item) => (
            <StatCard
              key={item.subject}
              label={item.subject}
              value={item.grade ?? "-"}
              caption={item.grade == null ? "Pendiente de publicación" : "Nota publicada"}
              tone={item.grade == null ? "warning" : "success"}
            />
          ))}
        </StatsGrid>

        <div className={styles.claimList}>
          {resultados.map((item) => (
            <div key={item.subject} className={styles.claimRow}>
              <div>
                <p className={styles.claimSubject}>{item.subject} {item.grade != null && <span className={styles.claimGrade}>{item.grade} pts</span>}</p>
                <p className={styles.claimHint}>{item.fecha_limite_reclamo ? `Plazo hasta el ${item.fecha_limite_reclamo}.` : item.grade == null ? "Aún no hay nota publicada." : "Sin plazo de reclamación definido."}</p>
              </div>
              {item.claim ? (
                <div className={styles.claimActions}>
                  <span className={`${styles.claimBadge} ${item.claim.status === "aprobada" ? styles.claimBadgeApproved : item.claim.status === "rechazada" ? styles.claimBadgeRejected : styles.claimBadgePending}`}>
                    {item.claim.status === "aprobada" ? "Reclamación aceptada" : item.claim.status === "rechazada" ? "Reclamación rechazada" : "Reclamación enviada"}
                  </span>
                  {item.claim.status === "aprobada" && <SecondaryButton className="!px-3 !py-2 !text-xs" onClick={() => setAcceptedClaim(item.claim)}>Ver detalles</SecondaryButton>}
                </div>
              ) : stage?.active && item.grade != null && (
                <PrimaryButton
                  className="!bg-orange-500 hover:!bg-orange-600"
                  onClick={() => { setClaimModal(item); setClaimDescription(""); }}
                  disabled={!item.puede_reclamar}
                >
                  {item.puede_reclamar ? "Reclamar" : "Plazo vencido"}
                </PrimaryButton>
              )}
            </div>
          ))}
          {!resultados.length && <p className={styles.emptyNotice}>Aún no hay resultados publicados.</p>}
        </div>

        <div className={styles.footerNote}>
          Los resultados se actualizan automáticamente cuando el proceso avanza. Verifica tu estado con frecuencia.
        </div>
      </Card>

      <Modal
        open={Boolean(claimModal)}
        onClose={() => setClaimModal(null)}
        title={claimModal?.subject}
        description="Reclamación de nota"
        footer={
          <>
            <SecondaryButton onClick={() => setClaimModal(null)}>Cancelar</SecondaryButton>
            <PrimaryButton
              className="!bg-orange-500 hover:!bg-orange-600"
              type="submit"
              form="claim-form"
              disabled={!claimDescription.trim() || claimingId === claimModal?.id}
            >
              {claimingId === claimModal?.id ? "Enviando..." : "Enviar reclamación"}
            </PrimaryButton>
          </>
        }
      >
        {claimModal && (
          <form id="claim-form" onSubmit={(event) => { event.preventDefault(); handleClaim(claimModal); }}>
            <div className={styles.claimFormSummary}>
              <p><span className="font-semibold">Nota obtenida:</span> {claimModal.grade}</p>
              <p><span className="font-semibold">Plazo:</span> {claimModal.fecha_limite_reclamo || "No definido"}</p>
            </div>
            <FormField label="Razón de la reclamación" className="mt-5">
              <TextArea value={claimDescription} onChange={(event) => setClaimDescription(event.target.value)} maxLength={500} required rows={5} placeholder="Explica por qué solicitas revisar esta nota." />
            </FormField>
          </form>
        )}
      </Modal>

      <Modal
        open={Boolean(acceptedClaim)}
        onClose={() => setAcceptedClaim(null)}
        title="Presentación para revisión"
        description="Reclamación aceptada"
        footer={<SecondaryButton onClick={() => setAcceptedClaim(null)}>Cerrar</SecondaryButton>}
      >
        {acceptedClaim && (
          <div className={styles.acceptedClaimBox}>
            <p><span className="font-semibold">Razón:</span> {acceptedClaim.description}</p>
            <p><span className="font-semibold">Día y hora:</span> {acceptedClaim.fecha_presentacion ? new Date(acceptedClaim.fecha_presentacion).toLocaleString("es-CU") : "No definido"}</p>
            <p><span className="font-semibold">Lugar:</span> {acceptedClaim.lugar_presentacion || "No definido"}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
