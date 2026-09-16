import { useEffect, useState } from "react";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import InterestMetricsView from "../../features/escuela/components/InterestMetricsView";
import { fetchSchoolInterestMetrics } from "../../services/api";
import { Card } from "../../components";

export default function DirectorBoletaInteresPage({ user }) {
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSchoolInterestMetrics()
      .then(setMetrics)
      .catch((requestError) => setError(requestError.message));
  }, []);

  if (error) {
    return <FeedbackMessage type="error" className="rounded-2xl">{error}</FeedbackMessage>;
  }

  if (!metrics) {
    return <LoadingState />;
  }

  return (
    <InterestMetricsView
      metrics={metrics}
      title="Estado de las boletas de interés"
      schoolName={user?.escuela_nombre}
    />
  );
}

function LoadingState() {
  return <Card padding="p-8" className="text-sm text-slate-600">Cargando métricas...</Card>;
}
