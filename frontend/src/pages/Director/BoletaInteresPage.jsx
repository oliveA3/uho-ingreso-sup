export default function DirectorBoletaInteresPage({ user }) {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700">Boletas de Interés</p>
        <div className="flex flex-wrap items-center gap-3"><h1 className="mt-2 text-3xl font-semibold text-slate-900">Estado de las boletas de interés</h1><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{user?.escuela_nombre || "Escuela no asignada"}</span></div>
        <p className="mt-3 text-sm text-slate-600">Consulta el avance de las boletas de interés de tu escuela.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6"><p className="text-sm text-slate-600">Enviadas</p><p className="mt-2 text-3xl font-semibold text-slate-900">--</p></div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6"><p className="text-sm text-slate-600">Pendientes</p><p className="mt-2 text-3xl font-semibold text-slate-900">--</p></div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6"><p className="text-sm text-slate-600">Total estudiantes</p><p className="mt-2 text-3xl font-semibold text-slate-900">--</p></div>
        </div>
      </section>
    </div>
  );
}
