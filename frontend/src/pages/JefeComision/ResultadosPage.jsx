import { useCallback, useEffect, useRef, useState } from "react";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import { downloadResultsExport, fetchResultClaims, fetchResults, importResults, updateResultClaim } from "../../api/results.service";
import EntityActionButton from "../../components/Buttons/EntityActionButton";
import SecondaryButton from "../../components/Buttons/SecondaryButton";
import PrimaryButton from "../../components/Buttons/PrimaryButton";
import StageStatusNotice from "../../components/StageStatusNotice/StageStatusNotice";
import { Card, DataTable, FormField, Input, Modal, Select, useConfirm } from "../../components";
import styles from "./ResultadosPage.module.css";

export default function ResultadosPage() {
  const confirm = useConfirm();
  const [results, setResults] = useState([]);
  const [claims, setClaims] = useState([]);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [decisionClaim, setDecisionClaim] = useState(null);
  const [presentationDate, setPresentationDate] = useState("");
  const [presentationPlace, setPresentationPlace] = useState("");
  const [decisionId, setDecisionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [stageActive, setStageActive] = useState(false);
  const year = new Date().getFullYear();
  const [subject, setSubject] = useState("Matematica");
  const [deadline, setDeadline] = useState(`${year}-03-05`);
  const fileInput = useRef(null);
  const handleStageStatus = useCallback((status) => {
    setStageActive(status === "en_curso");
  }, []);

  async function load() {
    try {
      const [resultData, claimData] = await Promise.all([fetchResults(year), fetchResultClaims(year)]);
      setResults(resultData);
      setClaims(claimData);
      setError("");
    }
    catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const shouldImport = await confirm({
      title: "Importar resultados",
      message: `Se importarán los resultados de "${file.name}" para ${subject} (${year}), sobrescribiendo las notas ya publicadas para esa asignatura. ¿Deseas continuar?`,
      confirmLabel: "Importar",
      tone: "danger",
    });
    if (!shouldImport) {
      event.target.value = "";
      return;
    }
    setImporting(true);
    try {
      const result = await importResults(file, year, subject, deadline);
      setNotice(`${result.inserted} resultados insertados y ${result.updated} actualizados.`);
      setError("");
      await load();
    } catch (requestError) { setError(requestError.message); }
    finally {
      setImporting(false);
      event.target.value = "";
    }
  }

  async function handleExport() {
    try {
      const blob = await downloadResultsExport(year, subject);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `resultados_${subject.toLowerCase()}_${year}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function resolveClaim(claim, estado, details = {}) {
    try {
      setDecisionId(claim.id);
      await updateResultClaim(claim.id, estado, details);
      setDecisionClaim(null);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDecisionId(null);
    }
  }

  async function rejectClaim(claim) {
    const ok = await confirm({
      title: "Rechazar reclamación",
      message: `¿Deseas rechazar la reclamación de ${claim.student} sobre ${claim.subject}? Esta acción no se puede deshacer.`,
      confirmLabel: "Rechazar",
      tone: "danger",
    });
    if (!ok) return;
    await resolveClaim(claim, "rechazada");
  }

  const columns = [
    { key: "estudiante", header: "Estudiante", render: (item) => item.student },
    { key: "asignatura", header: "Asignatura", render: (item) => item.subject },
    { key: "nota", header: "Nota", render: (item) => item.grade },
    { key: "escuela", header: "Escuela", render: (item) => item.school },
    ...(stageActive
      ? [
          {
            key: "accion",
            header: "Acción",
            render: (item) => (
              <div className={styles.actionsCell}>
                <SecondaryButton className={styles.smallButton} onClick={() => setSelectedClaim(item)}>Ver detalles</SecondaryButton>
                {item.status === "pendiente" && (
                  <>
                    <EntityActionButton variant="edit" className={styles.smallButton} onClick={() => { setDecisionClaim(item); setPresentationDate(""); setPresentationPlace(""); }} disabled={decisionId === item.id}>Aceptar</EntityActionButton>
                    <EntityActionButton variant="delete" className={styles.smallButton} onClick={() => rejectClaim(item)} disabled={decisionId === item.id}>Rechazar</EntityActionButton>
                  </>
                )}
                {item.status !== "pendiente" && <span className={styles.statusLabel}>{item.status === "aprobada" ? "Aceptada" : "Rechazada"}</span>}
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className={styles.page}>
      <Card padding="p-8">
        <div>
          <p className={styles.eyebrow}>Gestión de Resultados</p>
          <h1 className={styles.title}>Importar notas y gestionar reclamaciones</h1>
        </div>

        <StageStatusNotice stageNumber={5} onStatusChange={handleStageStatus} />
        <div className={styles.filterPanel}>
          <div className={styles.filterGrid}>
            <FormField label="Asignatura">
              <Select value={subject} onChange={(event) => setSubject(event.target.value)}>
                <option value="Matematica">Matematica</option>
                <option value="Espanol">Espanol</option>
                <option value="Historia">Historia</option>
              </Select>
            </FormField>
            {stageActive && (
              <FormField label="Fecha Límite Reclamaciones">
                <Input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} />
              </FormField>
            )}
          </div>
          {error && <FeedbackMessage type="error" className={styles.notice}>{error}</FeedbackMessage>}
          {notice && <FeedbackMessage type="success" className={styles.notice}>{notice}</FeedbackMessage>}
          <input
            ref={fileInput}
            type="file"
            accept=".xlsx"
            className={styles.hiddenInput}
            disabled={!stageActive || importing}
            onChange={handleImport}
          />
          <PrimaryButton className={styles.importButton} onClick={() => fileInput.current?.click()} disabled={!stageActive || importing}>{importing ? "Importando..." : "Importar resultados desde Excel"}</PrimaryButton>
          <SecondaryButton className={styles.exportButton} onClick={handleExport} disabled={!results.length}>Exportar resultados</SecondaryButton>
        </div>
      </Card>

      <Card padding="p-8">
        <div className={styles.summaryHeaderRow}>
          <p className={styles.summaryTitle}>Reclamaciones Pendientes</p>
          <span className={styles.pendingBadge}>{claims.filter((claim) => claim.status === "pendiente").length}</span>
        </div>

        <DataTable
          className="table-scroll mt-6"
          columns={columns}
          data={claims}
          loading={loading}
          loadingMessage="Cargando reclamaciones..."
          emptyMessage="No hay reclamaciones recibidas."
        />
      </Card>

      <Modal
        open={Boolean(selectedClaim)}
        onClose={() => setSelectedClaim(null)}
        title={selectedClaim?.student}
        description="Detalle de reclamación"
        footer={<SecondaryButton onClick={() => setSelectedClaim(null)}>Cerrar</SecondaryButton>}
      >
        {selectedClaim && (
          <>
            <div className={styles.detailGrid}>
              <p><span className={styles.detailLabel}>Asignatura:</span> {selectedClaim.subject}</p>
              <p><span className={styles.detailLabel}>Nota:</span> {selectedClaim.grade}</p>
              <p><span className={styles.detailLabel}>Escuela:</span> {selectedClaim.school}</p>
              <p><span className={styles.detailLabel}>Estado:</span> {selectedClaim.status}</p>
            </div>
            <div className={styles.reasonBox}>
              <p className={styles.reasonTitle}>Razón de la reclamación</p>
              <p className={styles.reasonText}>{selectedClaim.description}</p>
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={Boolean(decisionClaim)}
        onClose={() => setDecisionClaim(null)}
        title="Datos de presentación"
        description="Aceptar reclamación"
        footer={
          <>
            <SecondaryButton onClick={() => setDecisionClaim(null)}>Cancelar</SecondaryButton>
            <PrimaryButton type="submit" form="decision-claim-form" disabled={decisionId === decisionClaim?.id}>
              {decisionId === decisionClaim?.id ? "Guardando..." : "Aceptar y notificar"}
            </PrimaryButton>
          </>
        }
      >
        {decisionClaim && (
          <form
            id="decision-claim-form"
            onSubmit={(event) => {
              event.preventDefault();
              resolveClaim(decisionClaim, "aprobada", { fecha_presentacion: presentationDate, lugar_presentacion: presentationPlace });
            }}
          >
            <p className={styles.decisionIntro}>Indica cuándo y dónde debe presentarse {decisionClaim.student} para revisar la nota.</p>
            <FormField label="Día y hora" className={styles.decisionField}>
              <Input type="datetime-local" value={presentationDate} onChange={(event) => setPresentationDate(event.target.value)} required />
            </FormField>
            <FormField label="Lugar de presentación" className={styles.decisionFieldSpaced}>
              <Input value={presentationPlace} onChange={(event) => setPresentationPlace(event.target.value)} required maxLength={150} placeholder="Ej. Comisión de Ingreso Provincial" />
            </FormField>
          </form>
        )}
      </Modal>
    </div>
  );
}
