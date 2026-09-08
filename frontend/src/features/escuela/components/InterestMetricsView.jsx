import StageStatusNotice from "../../../components/StageStatusNotice";

export default function InterestMetricsView({ metrics, title, schoolName }) {
  const maximum = Math.max(...metrics.top_carreras.map((career) => career.total), 1);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700">Boletas de Interés</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">{title}</h1>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {schoolName || "Escuela no asignada"}
          </span>
        </div>
        <p className="mt-3 text-sm text-slate-600">Resumen de las boletas de interés de los estudiantes de tu escuela.</p>
        <StageStatusNotice stageNumber={2} />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Metric label="Enviadas" value={metrics.enviadas} color="text-emerald-700" />
          <Metric label="Pendientes" value={metrics.pendientes} color="text-amber-700" />
          <Metric label="Total estudiantes" value={metrics.total} color="text-slate-900" />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Demanda por carrera</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">Top 10 carreras más solicitadas</h2>
          </div>
          <span className="text-sm text-slate-500">{metrics.total_boletas} boletas registradas</span>
        </div>
        {metrics.top_carreras.length ? (
          <div className="mt-6 space-y-4">
            {metrics.top_carreras.map((career, index) => (
              <div key={career.id}>
                <div className="mb-1 flex items-center justify-between gap-4 text-sm">
                  <span className="min-w-0 truncate font-medium text-slate-700">{index + 1}. {career.nombre}</span>
                  <span className="shrink-0 font-semibold text-slate-900">{career.total}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-sky-500" style={{ width: `${(career.total / maximum) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-6 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">Aún no hay carreras solicitadas.</p>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Distribution title="Distribución por sexo" items={metrics.sexo || []} />
        <Distribution title="Tipo de otorgamiento" items={metrics.tipo_otorgamiento || []} />
      </section>
    </div>
  );
}

function Metric({ label, value, color }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
      <p className="text-sm uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className={`mt-3 text-3xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function Distribution({ title, items }) {
  const total = items.reduce((sum, item) => sum + item.total, 0);
  return <section className="rounded-3xl border border-slate-200 bg-white p-8"><h2 className="text-xl font-semibold text-slate-900">{title}</h2>{items.length ? <div className="mt-5 space-y-3">{items.map((item) => <div key={item.label} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"><span className="font-medium text-slate-700">{item.label}</span><span className="font-semibold text-slate-900">{item.total} <span className="text-xs font-normal text-slate-500">({total ? Math.round((item.total / total) * 100) : 0}%)</span></span></div>)}</div> : <p className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">Sin datos disponibles.</p>}</section>;
}
