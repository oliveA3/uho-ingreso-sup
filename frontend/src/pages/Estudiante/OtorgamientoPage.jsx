export default function EstudianteOtorgamientoPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700">Mi Otorgamiento</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Carrera otorgada</h1>
        <p className="mt-3 text-sm text-slate-600">Consulta la carrera que te fue otorgada en el proceso de ingreso.</p>
        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <p className="text-sm text-slate-600">Resultado de otorgamiento</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">Pendiente de publicación</p>
          <p className="mt-2 text-sm text-slate-600">La carrera otorgada aparecerá aquí cuando se publiquen los resultados finales.</p>
        </div>
      </section>
    </div>
  );
}
