import { useEffect, useState } from "react";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import StageStatusNotice from "../../components/StageStatusNotice/StageStatusNotice";
import PrimaryButton from "../../components/Buttons/PrimaryButton";
import { Card, DataTable } from "../../components";
import { downloadResultsExport, fetchResults } from "../../api/results.service";
import styles from "./ResultadosPage.module.css";

export default function SecretarioResultadosPage() {
  const year = new Date().getFullYear();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchResults(year)
      .then(setResults)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [year]);

  async function handleExport() {
    try {
      const blob = await downloadResultsExport(year);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `resultados_${year}_escuela.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const columns = [
    { key: "estudiante", header: "Estudiante", className: styles.studentCell, render: (r) => r.student },
    { key: "matematica", header: "Matemática", render: (r) => r.matematica ?? "-" },
    { key: "espanol", header: "Español", render: (r) => r.espanol ?? "-" },
    { key: "historia", header: "Historia", render: (r) => r.historia ?? "-" },
  ];

  return (
    <Card>
      <h1 className={styles.title}>Resultados</h1>
      <p className={styles.subtitle}>Estudiantes del escalafón y notas publicadas del proceso {year}.</p>
      <StageStatusNotice stageNumber={5} />
      {error && <FeedbackMessage type="error" className={styles.feedbackMessage}>{error}</FeedbackMessage>}

      <DataTable
        className={styles.table}
        columns={columns}
        data={results}
        loading={loading}
        loadingMessage="Cargando resultados..."
        emptyMessage="No existe un escalafón publicado para este año."
      />

      <div className={styles.actionsRow}>
        <PrimaryButton className={styles.exportButton} onClick={handleExport} disabled={!results.length}>Exportar Excel</PrimaryButton>
      </div>
    </Card>
  );
}
