export default function StageBanner({ stage }) {
  const badgeColor = stage.active ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-800";

  return (
    <section className="mb-12 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Etapa activa</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">{stage.label}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{stage.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-700">
            <span className="rounded-full bg-slate-100 px-3 py-1">{stage.dates}</span>
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${badgeColor}`}>{stage.status}</span>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <a href="#plazas" className="rounded-full bg-sky-600 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-sky-700">
            Ver plan de plazas
          </a>
          <a href="#noticias" className="rounded-full border border-slate-200 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-900 transition hover:bg-slate-50">
            Últimas noticias
          </a>
        </div>
      </div>
    </section>
  );
}
