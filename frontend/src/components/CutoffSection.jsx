export default function CutoffSection({ items }) {
  return (
    <section id="cortes" className="mb-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">Índices de corte</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Años anteriores</h2>
        </div>
      </div>
      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm uppercase tracking-[0.18em] text-slate-500">{item.year}</p>
            <h3 className="mt-3 text-xl font-semibold text-slate-900">{item.carrera}</h3>
            <p className="mt-2 text-3xl font-bold text-sky-600">{item.index}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
