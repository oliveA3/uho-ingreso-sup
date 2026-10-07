import { useEffect, useState } from "react";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import SchoolConfirmationMetrics from "../../components/SchoolConfirmationMetrics/SchoolConfirmationMetrics";
import { fetchSchoolExamConfirmationMetrics } from "../../api/school.service";
import { Card } from "../../components";
import styles from "./ConfirmacionPruebasPage.module.css";

export default function DirectorConfirmacionPruebasPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSchoolExamConfirmationMetrics().then(setData).catch((requestError) => setError(requestError.message));
  }, []);

  if (error) return <FeedbackMessage type="error" className={styles.errorMessage}>{error}</FeedbackMessage>;
  if (!data) return <Card padding="p-6" className={styles.loadingCard}>Cargando confirmaciones...</Card>;
  return (
    <SchoolConfirmationMetrics data={data} title="Estadísticas de confirmación" />
  );
}
