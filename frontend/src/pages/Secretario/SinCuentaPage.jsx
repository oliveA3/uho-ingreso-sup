import { useEffect, useState } from "react";
import { fetchStudentsWithoutAccount } from "../../services/api";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import { Card, DataTable, PageHeader } from "../../components";

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
    { key: "ci", header: "CI", className: "whitespace-nowrap text-slate-600", render: (s) => s.ci },
    { key: "nombre", header: "Nombre", className: "font-medium text-slate-900", render: (s) => `${s.nombre} ${s.apellidos}` },
    { key: "indice", header: "Índice general", render: (s) => s.indice_general ?? "--" },
  ];

  return (
    <Card>
      <PageHeader
        title="Estudiantes Sin Cuenta"
        subtitle="Lista de estudiantes que aún no han creado cuenta para que puedas gestionar su acceso."
      />

      {students.length > 0 && <FeedbackMessage type="warning" className="mt-4 mb-4 rounded-xl">Hay {students.length} estudiante(s) sin cuenta activa.</FeedbackMessage>}
      {error && <FeedbackMessage type="error" className="mb-4 rounded-xl">{error}</FeedbackMessage>}

      <DataTable
        className="mt-2"
        columns={columns}
        data={students}
        loading={loading}
        loadingMessage="Cargando estudiantes..."
        emptyMessage="No hay estudiantes sin cuenta."
      />
    </Card>
  );
}
