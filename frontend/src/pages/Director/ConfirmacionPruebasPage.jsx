import { useEffect, useState } from "react";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import SchoolConfirmationMetrics from "../../components/SchoolConfirmationMetrics/SchoolConfirmationMetrics";
import { fetchSchoolExamConfirmationMetrics } from "../../services/api";
import { Card } from "../../components";

export default function DirectorConfirmacionPruebasPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSchoolExamConfirmationMetrics().then(setData).catch((requestError) => setError(requestError.message));
  }, []);

  if (error) return <FeedbackMessage type="error" className="rounded-2xl">{error}</FeedbackMessage>;
  if (!data) return <Card padding="p-6" className="text-sm text-slate-600">Cargando confirmaciones...</Card>;
  return (
    <SchoolConfirmationMetrics data={data} title="Estadísticas de confirmación" />
  );
}
