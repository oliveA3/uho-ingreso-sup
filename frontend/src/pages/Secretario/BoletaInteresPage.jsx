export default function SecretarioBoletaInteresPage() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Boleta de Interés</h1>
      <p className="mt-2 text-sm text-slate-600">Resumen de boletas enviadas, pendientes y totales.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Enviadas</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">28</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Pendientes</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">17</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Total</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">45</p>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="text-base font-semibold text-slate-900">Top carreras más solicitadas</h2>
        <div className="mt-4 space-y-3 text-sm text-slate-600">
          <div className="flex items-center justify-between">
            <span>Ingeniería</span>
            <span className="font-semibold text-slate-900">18</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Medicina</span>
            <span className="font-semibold text-slate-900">14</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Licenciatura</span>
            <span className="font-semibold text-slate-900">11</span>
          </div>
        </div>
      </div>
    </div>
  );
}
