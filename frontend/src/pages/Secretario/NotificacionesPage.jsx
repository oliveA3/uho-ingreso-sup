export default function SecretarioNotificacionesPage() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Notificaciones</h1>
      <p className="mt-2 text-sm text-slate-600">Mensajes de etapa activada y solicitudes de revisión.</p>

      <div className="mt-6 space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Etapa activada</p>
          <p className="mt-2 text-sm text-slate-600">Se activó la etapa de Boleta de Interés para el proceso 2025.</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Solicitud de revisión</p>
          <p className="mt-2 text-sm text-slate-600">El estudiante Ana B. Vega solicitó revisión de su boleta de solicitud.</p>
        </div>
      </div>
    </div>
  );
}
