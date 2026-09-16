import { useEffect, useState } from "react";
import { downloadProvincialEscalafon, downloadSchoolEscalafon, fetchProvincialEscalafonSummary } from "../../services/api";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import StageStatusNotice from "../../components/StageStatusNotice/StageStatusNotice";
import PrimaryButton from "../../components/Buttons/PrimaryButton";
import SecondaryButton from "../../components/Buttons/SecondaryButton";
import { Card, DataTable, Modal } from "../../components";
import styles from "./EscalafonesPage.module.css";

const statusStyles = {
  Completo: "statusComplete",
  Parcial: "statusPartial",
  Pendiente: "statusPending",
};

export default function EscalafonesPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [selectedMunicipio, setSelectedMunicipio] = useState(null);
  const [schoolExporting, setSchoolExporting] = useState(null);

  useEffect(() => {
    fetchProvincialEscalafonSummary()
      .then(setSummary)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  async function exportExcel() {
    try {
      setExporting(true);
      setError("");
      const blob = await downloadProvincialEscalafon();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "escalafones-provinciales.xlsx";
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setExporting(false);
    }
  }

  async function exportSchool(school) {
    try {
      setSchoolExporting(school.id);
      const blob = await downloadSchoolEscalafon(school.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `escalafon-${school.nombre}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSchoolExporting(null);
    }
  }

  const columns = [
    { key: "nombre", header: "Municipio", className: styles.strongCell, render: (m) => m.nombre },
    { key: "escuelas", header: "Escuelas", render: (m) => m.escuelas },
    { key: "enviaron", header: "Enviaron", render: (m) => `${m.escuelas_enviaron}/${m.escuelas}` },
    { key: "estudiantes", header: "Estudiantes", render: (m) => m.estudiantes },
    {
      key: "estado",
      header: "Estado",
      render: (m) => <span className={styles[statusStyles[m.estado]]}>{m.estado}</span>,
    },
    {
      key: "detalle",
      header: "Detalle",
      render: (m) => <SecondaryButton className={styles.detailButton} onClick={() => setSelectedMunicipio(m)}>Ver escuelas</SecondaryButton>,
    },
  ];

  return (
    <div className={styles.page}>
      <Card padding="p-6 sm:p-8">
        <div className={styles.headerRow}>
          <div>
            <p className={styles.eyebrow}>Escalafones recibidos</p>
            <h1 className={styles.title}>Estado provincial</h1>
            <p className={styles.description}>Seguimiento de los escalafones enviados por cada municipio.</p>
          </div>
          <PrimaryButton className={styles.darkButton} onClick={exportExcel} disabled={exporting}>
            {exporting ? "Exportando..." : "Exportar Excel"}
          </PrimaryButton>
        </div>

        {error && <FeedbackMessage type="error" className="mt-5 rounded-2xl">{error}</FeedbackMessage>}

        <StageStatusNotice stageNumber={1} />

        <div className={styles.summaryGrid}>
          <div className={styles.summaryCardSuccess}><p className={styles.summaryLabel}>Escuelas enviaron</p><p className={styles.summaryValue}>{summary?.escuelas_enviaron ?? "-"}</p></div>
          <div className={styles.summaryCardWarning}><p className={styles.summaryLabel}>Escuelas pendientes</p><p className={styles.summaryValue}>{summary?.escuelas_pendientes ?? "-"}</p></div>
          <div className={styles.summaryCard}><p className={styles.summaryLabel}>Total estudiantes</p><p className={styles.summaryValue}>{summary?.total_estudiantes ?? "-"}</p></div>
        </div>

        <DataTable
          className={styles.table}
          columns={columns}
          data={summary?.municipios || []}
          loading={loading}
          loadingMessage="Cargando estado provincial..."
          emptyMessage="No hay municipios disponibles."
        />
      </Card>
      <Modal
        open={Boolean(selectedMunicipio)}
        onClose={() => setSelectedMunicipio(null)}
        title={selectedMunicipio ? `Escuelas de ${selectedMunicipio.nombre}` : ""}
        description="Descarga el escalafón de una escuela específica."
        footer={<SecondaryButton onClick={() => setSelectedMunicipio(null)}>Cerrar</SecondaryButton>}
      >
        <div className={styles.schoolsList}>
          {selectedMunicipio?.escuelas_lista.map((school) => (
            <div key={school.id} className={styles.schoolRow}>
              <div>
                <p className={styles.strongCell}>{school.nombre}</p>
                <p className={styles.schoolStatus}>{school.estado === "enviado" ? "Enviado" : "Pendiente"}</p>
              </div>
              <PrimaryButton
                className={styles.schoolButton}
                onClick={() => exportSchool(school)}
                disabled={schoolExporting === school.id || school.estado !== "enviado"}
              >
                {schoolExporting === school.id ? "Descargando..." : "Descargar Excel"}
              </PrimaryButton>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
