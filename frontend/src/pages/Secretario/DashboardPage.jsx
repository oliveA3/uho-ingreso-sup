import StageStatusNotice from "../../components/StageStatusNotice";
import { useEffect, useState } from "react";
import { fetchSchoolDashboard } from "../../services/api";
import BallotMetrics from "../../features/escuela/components/BallotMetrics";

export default function SecretarioDashboardPage({ user, title = "Dashboard Secretario" }) {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => { fetchSchoolDashboard().then(setDashboard).catch((requestError) => setError(requestError.message)); }, []);

  if (error) return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-sm text-rose-700">{error}</div>;
  if (!dashboard) return <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600">Cargando información del dashboard...</div>;
  const total = dashboard.students || 1;
  const activeStageNumber = dashboard.active_stage?.numero || 0;
  const usesSolicitud = activeStageNumber >= 3;
  const ballotStats = usesSolicitud ? dashboard.solicitud : dashboard.interest;
  const ballotTitle = usesSolicitud ? "Boleta de Solicitud" : "Boleta de Interés";
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="space-y-3">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">{user?.escuela_nombre || "Escuela no asignada"}</span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Resumen de etapa activa, estudiantes, boletas y escalafón para tu escuela.
          </p>
        </div>

        <StageStatusNotice />

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Total Estudiantes</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{dashboard.students}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Con cuenta</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{dashboard.students_with_account}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Boletas enviadas</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{ballotStats.sent}</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-base font-semibold text-slate-900">Estado de Escalafón</h2>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Aceptaron</span>
                <span className="font-semibold text-slate-900">{dashboard.escalafon.accepted}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200">
                <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${dashboard.escalafon.accepted / total * 100}%` }} />
              </div>
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Revisión</span>
                <span className="font-semibold text-slate-900">{dashboard.escalafon.review}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200">
                <div className="h-2 rounded-full bg-amber-500" style={{ width: `${dashboard.escalafon.review / total * 100}%` }} />
              </div>
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Sin respuesta</span>
                <span className="font-semibold text-slate-900">{dashboard.escalafon.no_response}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200">
                <div className="h-2 rounded-full bg-slate-900" style={{ width: `${dashboard.escalafon.no_response / total * 100}%` }} />
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="mb-4 text-base font-semibold text-slate-900">{ballotTitle}</h2>
            <BallotMetrics items={[
              { label: "Enviadas", value: ballotStats.sent, color: "text-emerald-700" },
              { label: "Pendientes", value: ballotStats.pending, color: "text-amber-700" },
              ...(usesSolicitud ? [{ label: "Aprobadas", value: ballotStats.approved, color: "text-sky-700" }] : []),
              ...(usesSolicitud ? [{ label: "Modificadas", value: ballotStats.modified, color: "text-orange-700" }] : []),
            ]} />
          </div>
        </div>
      </div>
    </div>
  );
}
