import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchStudentDashboard } from "../../services/api";
import FeedbackMessage from "../../components/FeedbackMessage";

const stageLabels = {
  1: "Escalafón",
  2: "Interés",
  3: "Solicitud",
  4: "Pruebas",
  5: "Resultados",
  6: "Carrera",
};

function formatDate(value) {
  if (!value) return "Sin fecha definida";
  return new Intl.DateTimeFormat("es-CU", { day: "numeric", month: "long" }).format(new Date(`${value}T00:00:00`));
}

export default function EstudianteHomePage() {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStudentDashboard().then(setDashboard).catch((requestError) => setError(requestError.message));
  }, []);

  const academic = dashboard?.academic;
  const activeStage = dashboard?.active_stage;
  const stages = dashboard?.stages || [];
  const studentName = dashboard?.student?.nombre || "Estudiante";

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <header>
          <p className="text-3xl font-semibold text-slate-900">¡Hola, {studentName}!</p>
          <p className="mt-2 text-sm text-slate-600">
            Proceso {new Date().getFullYear()} — {dashboard?.student?.escuela || "Escuela"} — {dashboard?.student?.municipio || "Municipio"}
          </p>
        </header>

        {error && <FeedbackMessage type="error" className="mt-6 rounded-2xl">{error}</FeedbackMessage>}
        {activeStage && (
          <FeedbackMessage type="success" className="mt-6 rounded-2xl">
            <strong>Etapa activa:</strong> {stageLabels[activeStage.numero] || activeStage.nombre} — Hasta el {formatDate(activeStage.fecha_fin)}.
          </FeedbackMessage>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            [academic?.indice_general ?? "--", "Índice General", "text-sky-800"],
            [academic?.position ? `#${academic.position}` : "--", "Posición Escalafón", "text-emerald-700"],
            [`${dashboard?.interest_count ?? 0}/10`, "Carreras Seleccionadas", "text-orange-600"],
            [activeStage?.numero === 4 ? `${dashboard?.confirmations_count ?? 0}` : "--", "Pruebas Confirmadas", "text-sky-800"],
          ].map(([value, label, color]) => (
            <div key={label} className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <p className={`text-3xl font-semibold ${color}`}>{value}</p>
              <p className="mt-2 text-sm text-slate-600">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="min-w-0 rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <h2 className="font-semibold text-slate-900">📈 Estado del Proceso</h2>
            <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
                {stages.map((stage) => {
                  const completed = stage.estado === "completada";
                  const active = stage.estado === "en_curso";
                  return (
                    <div key={stage.numero} className="min-w-0 text-center">
                      <div className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold ${completed ? "border-emerald-600 bg-emerald-600 text-white" : active ? "border-sky-600 bg-sky-600 text-white" : "border-slate-300 bg-white text-slate-500"}`}>
                        {completed ? "✓" : stage.numero}
                      </div>
                      <p className={`mt-2 text-xs ${active ? "font-semibold text-sky-700" : "text-slate-600"}`}>{stageLabels[stage.numero]}</p>
                    </div>
                  );
                })}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="font-semibold text-slate-900">🔔 Notificaciones</h2>
            <div className="mt-3 space-y-2">
              {!dashboard && <p className="text-xs text-slate-500">Cargando notificaciones...</p>}
              {dashboard && !dashboard.notifications.length && <p className="text-xs text-slate-500">No tienes notificaciones nuevas.</p>}
              {dashboard?.notifications.map((notification) => (
                <div key={notification.id} className="border-b border-slate-200 pb-2 text-xs last:border-0 last:pb-0">
                  <p className="font-semibold text-slate-800">{notification.mensaje}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{formatDate(notification.created_at?.slice(0, 10))}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="boleta-interes" className="rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700">🎯 Completar Boleta de Interés</Link>
          <Link to="escalafon" className="rounded-2xl border border-sky-600 px-4 py-3 text-sm font-semibold text-sky-700">📋 Ver Escalafón</Link>
          <Link to="boleta" className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700">📝 Ver Boleta de Solicitud</Link>
        </div>
      </section>
    </div>
  );
}
