import { useEffect, useState } from "react";
import { fetchStudentsWithoutAccount } from "../../services/api";
import FeedbackMessage from "../../components/FeedbackMessage";

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

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Estudiantes Sin Cuenta</h1>
        <p className="mt-2 text-sm text-slate-600">
          Lista de estudiantes que aún no han creado cuenta para que puedas gestionar su acceso.
        </p>
      </div>

      {students.length > 0 && <FeedbackMessage type="warning" className="mb-4 rounded-xl">Hay {students.length} estudiante(s) sin cuenta activa.</FeedbackMessage>}
      {error && <FeedbackMessage type="error" className="mb-4 rounded-xl">{error}</FeedbackMessage>}

      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-100 text-slate-500">
            <tr>
              <th className="px-4 py-3">CI</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Índice general</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {loading && <tr><td colSpan="3" className="px-4 py-8 text-center text-slate-500">Cargando estudiantes...</td></tr>}
            {!loading && !students.length && <tr><td colSpan="3" className="px-4 py-8 text-center text-slate-500">No hay estudiantes sin cuenta.</td></tr>}
            {!loading && students.map((student) => (
              <tr key={student.id}>
                <td className="whitespace-nowrap px-4 py-4">{student.ci}</td>
                <td className="px-4 py-4 font-medium text-slate-900">{student.nombre} {student.apellidos}</td>
                <td className="px-4 py-4 text-slate-600">{student.indice_general ?? "--"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
