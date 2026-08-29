import { useEffect, useState } from "react";
import FeedbackMessage from "../../components/FeedbackMessage";
import InterestMetricsView from "../../features/escuela/components/InterestMetricsView";
import { fetchSchoolInterestMetrics } from "../../services/api";

export default function SecretarioBoletaInteresPage({ user }) {
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
      title="Resumen de boletas de interés"
      schoolName={user?.escuela_nombre}
    />
  );
}

function LoadingState() {
  return <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">Cargando métricas...</div>;
}
