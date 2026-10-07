import { useEffect, useState } from "react";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import InterestMetricsView from "../../components/InterestMetricsView/InterestMetricsView";
import { fetchSchoolInterestMetrics } from "../../api/school.service";
import { Card } from "../../components";
import styles from "./BoletaInteresPage.module.css";

export default function DirectorBoletaInteresPage({ user }) {
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSchoolInterestMetrics()
      .then(setMetrics)
      .catch((requestError) => setError(requestError.message));
  }, []);

  if (error) {
    return <FeedbackMessage type="error" className={styles.errorMessage}>{error}</FeedbackMessage>;
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
  return <Card padding="p-6" className={styles.loadingCard}>Cargando métricas...</Card>;
}
