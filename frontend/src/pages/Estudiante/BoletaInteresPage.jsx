export default function EstudianteBoletaInteresPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700">Boleta de Interés</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Carreras de interés</h1>
        <p className="mt-3 text-sm text-slate-600">Selecciona las carreras que te interesan para el proceso de ingreso.</p>
        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
          Tu boleta de interés aparecerá aquí cuando se habilite la Etapa 2.
        </div>
      </section>
    </div>
  );
}
