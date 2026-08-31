import { useEffect, useState } from "react";
import FeedbackMessage from "../../components/FeedbackMessage";
import SchoolConfirmationMetrics from "../../components/SchoolConfirmationMetrics";
import { fetchSchoolExamConfirmationMetrics } from "../../services/api";

export default function SecretarioConfirmacionPruebasPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSchoolExamConfirmationMetrics().then(setData).catch((requestError) => setError(requestError.message));
  }, []);

  if (error) return <FeedbackMessage type="error" className="rounded-2xl">{error}</FeedbackMessage>;
  if (!data) return <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">Cargando confirmaciones...</div>;
  return <SchoolConfirmationMetrics data={data} title="Confirmación de Pruebas" />;
}
