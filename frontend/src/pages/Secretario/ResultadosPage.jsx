import { useEffect, useState } from "react";
import FeedbackMessage from "../../components/FeedbackMessage";
import StageStatusNotice from "../../components/StageStatusNotice";
import { downloadResultsExport, fetchResults } from "../../services/api";

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

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Resultados</h1>
      <p className="mt-2 text-sm text-slate-600">Estudiantes del escalafón y notas publicadas del proceso {year}.</p>
      <StageStatusNotice stageNumber={5} />
      {error && <FeedbackMessage type="error" className="mt-4 rounded-xl">{error}</FeedbackMessage>}

      <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-100 text-slate-500">
            <tr>
              <th className="px-4 py-3">Estudiante</th>
              <th className="px-4 py-3">Matemática</th>
              <th className="px-4 py-3">Español</th>
              <th className="px-4 py-3">Historia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {loading && <tr><td colSpan="4" className="px-4 py-8 text-center text-slate-500">Cargando resultados...</td></tr>}
            {!loading && !results.length && <tr><td colSpan="4" className="px-4 py-8 text-center text-slate-500">No existe un escalafón publicado para este año.</td></tr>}
            {results.map((result) => (
              <tr key={result.id}>
                <td className="px-4 py-4 font-medium text-slate-900">{result.student}</td>
                <td className="px-4 py-4 text-slate-600">{result.matematica ?? "-"}</td>
                <td className="px-4 py-4 text-slate-600">{result.espanol ?? "-"}</td>
                <td className="px-4 py-4 text-slate-600">{result.historia ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end">
        <button type="button" onClick={handleExport} disabled={!results.length} className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50">Exportar Excel</button>
      </div>
    </div>
  );
}
