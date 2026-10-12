import { useEffect, useState } from "react";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import StageStatusNotice from "../../components/StageStatusNotice/StageStatusNotice";
import ExportButton from "../../components/Buttons/ExportButton";
import { Card, DataTable, PageHeader } from "../../components";
import { downloadStageSixExport } from "../../api/results.service";
import { fetchSchoolOtorgamientos } from "../../api/school.service";
import styles from "./OtorgamientosPage.module.css";

export default function SecretarioOtorgamientosPage() {
  const year = new Date().getFullYear();
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSchoolOtorgamientos(year)
      .then((data) => setItems(data.items || []))
      .catch((requestError) => setError(requestError.message));
  }, [year]);

  async function handleExport() {
    try {
      const blob = await downloadStageSixExport("otorgamientos", year);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `otorgamientos_${year}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleExportCuts() {
    try {
      const blob = await downloadStageSixExport("cortes", year);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `cortes_${year}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const columns = [
    { key: "estudiante", header: "Estudiante", className: styles.studentCell, render: (item) => item.student },
    { key: "indice_general", header: "Índice general", render: (item) => item.general_index ?? "-" },
    { key: "indice_otorgamiento", header: "Índice otorgamiento", render: (item) => item.award_index },
    { key: "carrera", header: "Carrera", render: (item) => item.career },
    { key: "ces", header: "CES", render: (item) => item.ces },
  ];

  return (
    <Card>
      <PageHeader
        title="Otorgamientos"
        subtitle={`Lista real de otorgamientos de tu escuela para ${year}.`}
      />
      <StageStatusNotice stageNumber={6} />
      {error && <FeedbackMessage type="error" className={styles.feedbackMessage}>{error}</FeedbackMessage>}

      <DataTable
        className={styles.table}
        columns={columns}
        data={items}
        emptyMessage="No hay otorgamientos publicados para tu escuela."
      />

      <div className={styles.actionsRow}>
        <ExportButton variant="primary" className={styles.exportButton} onClick={handleExport}>Exportar otorgamientos</ExportButton>
        <ExportButton className={styles.exportCutsButton} onClick={handleExportCuts}>Exportar índices de corte</ExportButton>
      </div>
    </Card>
  );
}
