const resultados = [
  { label: "Puntaje Total", value: "87.5" },
  { label: "Ranking Provincial", value: "24" },
  { label: "Estado de Evaluación", value: "Aprobado" },
];

export default function ResultadosPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">📊 Resultados</h1>
            <p className="mt-2 text-sm text-slate-600">Consulta tu rendimiento, puntaje y estado del proceso.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {resultados.map((item) => (
            <div key={item.label} className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center">
              <p className="text-sm font-semibold text-slate-900">{item.label}</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700">
          Los resultados se actualizan automáticamente cuando el proceso avanza. Verifica tu estado con frecuencia.
        </div>
      </section>
    </div>
  );
}
