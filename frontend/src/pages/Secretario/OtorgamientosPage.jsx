import { useEffect, useState } from "react";
import FeedbackMessage from "../../components/FeedbackMessage";
import StageStatusNotice from "../../components/StageStatusNotice";
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

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Otorgamientos</h1>
      <p className="mt-2 text-sm text-slate-600">Lista real de otorgamientos de tu escuela para {year}.</p>
      <StageStatusNotice stageNumber={6} />
      {error && <FeedbackMessage type="error" className="mt-4 rounded-xl">{error}</FeedbackMessage>}

      <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-100 text-slate-500">
            <tr>
              <th className="px-4 py-3">Estudiante</th>
              <th className="px-4 py-3">Índice general</th>
              <th className="px-4 py-3">Índice otorgamiento</th>
              <th className="px-4 py-3">Carrera</th>
              <th className="px-4 py-3">CES</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {items.length ? items.map((item) => <tr key={item.id}>
              <td className="px-4 py-4 font-medium text-slate-900">{item.student}</td>
              <td className="px-4 py-4 text-slate-600">{item.general_index ?? "-"}</td>
              <td className="px-4 py-4 text-slate-600">{item.award_index}</td>
              <td className="px-4 py-4 text-slate-600">{item.career}</td>
              <td className="px-4 py-4 text-slate-600">{item.ces}</td>
            </tr>) : <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-500">No hay otorgamientos publicados para tu escuela.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end">
        <div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={handleExport} className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700">Exportar otorgamientos</button><button type="button" onClick={() => handleExportCuts()} className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Exportar índices de corte</button></div>
      </div>
    </div>
  );
}
