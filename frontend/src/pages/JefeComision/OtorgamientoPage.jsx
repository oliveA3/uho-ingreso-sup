export default function OtorgamientoPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700">Otorgamiento de Carreras</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Importar otorgamientos y cortes</h1>
          <p className="mt-3 text-sm text-slate-600">Carga exámenes, otorgamientos y valores de corte de carrera para publicar los resultados finales.</p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-sm font-semibold text-slate-900">Importar Otorgamientos</p>
            <p className="mt-2 text-sm text-slate-600">Carga un archivo Excel con CI, código de carrera, nombre y índice.</p>
            <button className="mt-4 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">Importar Otorgamientos</button>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-sm font-semibold text-slate-900">Importar Índices de Corte</p>
            <p className="mt-2 text-sm text-slate-600">Carga datos de corte para que el sistema publique resultados.</p>
            <button className="mt-4 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">Importar Índices</button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Resumen</p>
            <p className="text-sm text-slate-600">Carreras y estudiantes con otorgamiento publicado.</p>
          </div>
          <button className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">Exportar</button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-emerald-50 p-6 text-center">
            <p className="text-sm text-slate-600">Carreras Otorgadas</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">4,180</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-amber-50 p-6 text-center">
            <p className="text-sm text-slate-600">Sin Otorgamiento</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">50</p>
          </div>
        </div>
      </section>
    </div>
  );
}
