import { useEffect, useState } from "react";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import StageStatusNotice from "../../components/StageStatusNotice/StageStatusNotice";
import PrimaryButton from "../../components/Buttons/PrimaryButton";
import SecondaryButton from "../../components/Buttons/SecondaryButton";
import { Card, DataTable } from "../../components";
import { downloadStageSixExport, fetchSchoolOtorgamientos } from "../../services/api";

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
    { key: "estudiante", header: "Estudiante", className: "font-medium text-slate-900", render: (item) => item.student },
    { key: "indice_general", header: "Índice general", render: (item) => item.general_index ?? "-" },
    { key: "indice_otorgamiento", header: "Índice otorgamiento", render: (item) => item.award_index },
    { key: "carrera", header: "Carrera", render: (item) => item.career },
    { key: "ces", header: "CES", render: (item) => item.ces },
  ];

  return (
    <Card>
      <h1 className="text-2xl font-semibold text-slate-900">Otorgamientos</h1>
      <p className="mt-2 text-sm text-slate-600">Lista real de otorgamientos de tu escuela para {year}.</p>
      <StageStatusNotice stageNumber={6} />
      {error && <FeedbackMessage type="error" className="mt-4 rounded-xl">{error}</FeedbackMessage>}

      <DataTable
        className="mt-6"
        columns={columns}
        data={items}
        emptyMessage="No hay otorgamientos publicados para tu escuela."
      />

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <PrimaryButton className="!rounded-full !bg-slate-900 hover:!bg-slate-700" onClick={handleExport}>Exportar otorgamientos</PrimaryButton>
        <SecondaryButton className="!rounded-full" onClick={handleExportCuts}>Exportar índices de corte</SecondaryButton>
      </div>
    </Card>
  );
}
