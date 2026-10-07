import { useEffect, useState } from "react";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import SchoolConfirmationMetrics from "../../components/SchoolConfirmationMetrics/SchoolConfirmationMetrics";
import { fetchSchoolExamConfirmationMetrics } from "../../api/school.service";
import styles from "./ConfirmacionPruebasPage.module.css";

export default function SecretarioConfirmacionPruebasPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSchoolExamConfirmationMetrics().then(setData).catch((requestError) => setError(requestError.message));
  }, []);

  if (error) return <FeedbackMessage type="error" className={styles.errorMessage}>{error}</FeedbackMessage>;
  if (!data) return <div className={styles.loadingState}>Cargando confirmaciones...</div>;
  return <SchoolConfirmationMetrics data={data} title="Confirmación de Pruebas" />;
}
