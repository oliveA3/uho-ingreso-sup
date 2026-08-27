export default function DirectorOtorgamientosPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700">Otorgamientos</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Otorgamientos de tu escuela</h1>
        <p className="mt-3 text-sm text-slate-600">Consulta el resumen de carreras otorgadas a los estudiantes de tu escuela.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6"><p className="text-sm text-slate-600">Otorgamientos</p><p className="mt-2 text-3xl font-semibold text-slate-900">--</p></div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6"><p className="text-sm text-slate-600">Estudiantes sin carrera</p><p className="mt-2 text-3xl font-semibold text-slate-900">--</p></div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6"><p className="text-sm text-slate-600">Total estudiantes</p><p className="mt-2 text-3xl font-semibold text-slate-900">--</p></div>
        </div>
      </section>
    </div>
  );
}
