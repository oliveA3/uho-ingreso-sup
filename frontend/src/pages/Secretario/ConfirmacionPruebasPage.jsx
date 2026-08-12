export default function SecretarioConfirmacionPruebasPage() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Confirmación de Pruebas</h1>
      <p className="mt-2 text-sm text-slate-600">Conteo de confirmados por asignatura para el proceso actual.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Matemática</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">38/45</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Español</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">41/45</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Historia</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">39/45</p>
        </div>
      </div>
    </div>
  );
}
