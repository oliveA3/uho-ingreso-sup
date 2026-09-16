import { useCallback, useEffect, useRef, useState } from "react";
import StageStatusNotice from "../../components/StageStatusNotice/StageStatusNotice";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import PrimaryButton from "../../components/Buttons/PrimaryButton";
import SecondaryButton from "../../components/Buttons/SecondaryButton";
import { Card } from "../../components";
import { downloadStageSixExport, fetchOtorgamientoSummary, importCortesCarrera, importOtorgamientos } from "../../services/api";
import styles from "./OtorgamientoPage.module.css";

export default function OtorgamientoPage() {
  const [stageActive, setStageActive] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [importing, setImporting] = useState("");
  const [summary, setSummary] = useState({ awarded_count: 0, without_award_count: 0, cuts_count: 0 });
  const year = new Date().getFullYear();
  const otorgamientoInput = useRef(null);
  const corteInput = useRef(null);
  const handleStageStatus = useCallback((status) => {
    setStageActive(status === "en_curso");
  }, []);

  async function loadSummary() {
    try {
      setSummary(await fetchOtorgamientoSummary(year));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  useEffect(() => { loadSummary(); }, []);

  async function handleImport(event, type) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setImporting(type);
      const result = type === "otorgamientos"
        ? await importOtorgamientos(file)
        : await importCortesCarrera(file);
      setNotice(`${result.inserted} insertados y ${result.updated} actualizados.`);
      setError("");
      await loadSummary();
    } catch (requestError) {
      setError(requestError.message);
      setNotice("");
    } finally {
      setImporting("");
      event.target.value = "";
    }
  }

  async function handleExport(kind) {
    try {
      const blob = await downloadStageSixExport(kind, year);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${kind}_${year}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <div className={styles.page}>
      <Card padding="p-8">
        <div>
          <p className={styles.eyebrow}>Otorgamiento de Carreras</p>
          <h1 className={styles.title}>Importar otorgamientos y cortes</h1>
          <p className={styles.description}>Carga exámenes, otorgamientos y valores de corte de carrera para publicar los resultados finales.</p>
        </div>

        <StageStatusNotice stageNumber={6} onStatusChange={handleStageStatus} />
        {error && <FeedbackMessage type="error" className={styles.notice}>{error}</FeedbackMessage>}
        {notice && <FeedbackMessage type="success" className={styles.notice}>{notice}</FeedbackMessage>}

        <div className={styles.importGrid}>
          <div className={styles.importCard}>
            <p className={styles.importTitle}>Importar Otorgamientos</p>
            <p className={styles.importDescription}>Carga un archivo Excel con CI, código de carrera, nombre y índice.</p>
            <input ref={otorgamientoInput} type="file" accept=".xlsx" className={styles.hiddenInput} disabled={!stageActive} onChange={(event) => handleImport(event, "otorgamientos")} />
            <div className={styles.importActions}>
              <PrimaryButton className={styles.importButton} onClick={() => otorgamientoInput.current?.click()} disabled={!stageActive || importing === "otorgamientos"}>
                {importing === "otorgamientos" ? "Importando..." : "Importar Otorgamientos"}
              </PrimaryButton>
              <SecondaryButton className={styles.exportButton} onClick={() => handleExport("otorgamientos")}>Exportar Otorgamientos</SecondaryButton>
            </div>
          </div>
          <div className={styles.importCard}>
            <p className={styles.importTitle}>Importar Índices de Corte</p>
            <p className={styles.importDescription}>Carga datos de corte para que el sistema publique resultados.</p>
            <input ref={corteInput} type="file" accept=".xlsx" className={styles.hiddenInput} disabled={!stageActive} onChange={(event) => handleImport(event, "cortes")} />
            <div className={styles.importActions}>
              <PrimaryButton className={styles.importButton} onClick={() => corteInput.current?.click()} disabled={!stageActive || importing === "cortes"}>
                {importing === "cortes" ? "Importando..." : "Importar Índices"}
              </PrimaryButton>
              <SecondaryButton className={styles.exportButton} onClick={() => handleExport("cortes")}>Exportar Índices</SecondaryButton>
            </div>
          </div>
        </div>
      </Card>

      <Card padding="p-8">
        <div className={styles.summaryHeader}>
          <div>
            <p className={styles.summaryTitle}>Resumen</p>
            <p className={styles.summarySubtitle}>Carreras y estudiantes con otorgamiento publicado.</p>
          </div>
        </div>

        <div className={styles.summaryGrid}>
          <div className={styles.summaryCardSuccess}>
            <p className={styles.summaryLabel}>Carreras Otorgadas</p>
            <p className={styles.summaryValue}>{summary.awarded_count ?? 0}</p>
          </div>
          <div className={styles.summaryCardWarning}>
            <p className={styles.summaryLabel}>Sin Otorgamiento</p>
            <p className={styles.summaryValue}>{summary.without_award_count ?? 0}</p>
          </div>
          <div className={styles.summaryCardInfo}>
            <p className={styles.summaryLabel}>Índices de Corte</p>
            <p className={styles.summaryValue}>{summary.cuts_count ?? 0}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
