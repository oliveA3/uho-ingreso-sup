import { useEffect, useState } from "react";
import { fetchStudentsWithoutAccount } from "../../api/school.service";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import { Card, DataTable, PageHeader } from "../../components";
import styles from "./SinCuentaPage.module.css";

export default function SecretarioSinCuentaPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStudentsWithoutAccount()
      .then((data) => setStudents(data.students || []))
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: "ci", header: "CI", className: styles.ciCell, render: (s) => s.ci },
    { key: "nombre", header: "Nombre", className: styles.nameCell, render: (s) => `${s.nombre} ${s.apellidos}` },
    { key: "indice", header: "Índice general", render: (s) => s.indice_general ?? "--" },
  ];

  return (
    <Card>
      <PageHeader
        title="Estudiantes Sin Cuenta"
        subtitle="Lista de estudiantes que aún no han creado cuenta para que puedas gestionar su acceso."
      />

      {students.length > 0 && <FeedbackMessage type="warning" className={styles.warningMessage}>Hay {students.length} estudiante(s) sin cuenta activa.</FeedbackMessage>}
      {error && <FeedbackMessage type="error" className={styles.errorMessage}>{error}</FeedbackMessage>}

      <DataTable
        className={styles.table}
        columns={columns}
        data={students}
        loading={loading}
        loadingMessage="Cargando estudiantes..."
        emptyMessage="No hay estudiantes sin cuenta."
      />
    </Card>
  );
}
