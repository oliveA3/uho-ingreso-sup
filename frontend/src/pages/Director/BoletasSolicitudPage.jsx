export default function DirectorBoletasSolicitudPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700">Boletas de Interés</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Estadísticas de boletas completadas</h1>
        <p className="mt-3 text-sm text-slate-600">Consulta el estado de las boletas de interés llenadas por los estudiantes de tu escuela.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6"><p className="text-sm text-slate-600">Completadas</p><p className="mt-2 text-3xl font-semibold text-slate-900">--</p></div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6"><p className="text-sm text-slate-600">Pendientes</p><p className="mt-2 text-3xl font-semibold text-slate-900">--</p></div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6"><p className="text-sm text-slate-600">Total estudiantes</p><p className="mt-2 text-3xl font-semibold text-slate-900">--</p></div>
        </div>
      </section>
    </div>
  );
}
