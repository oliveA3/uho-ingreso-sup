export default function EstudianteConfirmacionPruebasPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700">Confirmación de Pruebas</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Confirma tus pruebas de ingreso</h1>
        <p className="mt-3 text-sm text-slate-600">Revisa las asignaturas y confirma tu participación en las pruebas de ingreso.</p>
        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <p className="font-semibold text-slate-900">Estado de confirmación</p>
          <p className="mt-2 text-sm text-slate-600">Aún no hay pruebas disponibles para confirmar.</p>
          <button type="button" disabled className="mt-5 rounded-2xl bg-slate-300 px-4 py-2 text-sm font-semibold text-slate-500">Confirmar pruebas</button>
        </div>
      </section>
    </div>
  );
}
