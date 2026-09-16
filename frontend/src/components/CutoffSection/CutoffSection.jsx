export default function CutoffSection({ items, year, onViewMore }) {
  return (
    <section id="cortes" className="mb-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">Índices de corte</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Más solicitadas {year ? `(${year})` : ""}</h2>
        </div>
        {onViewMore && <button type="button" onClick={onViewMore} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Ver más</button>}
      </div>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm uppercase tracking-[0.18em] text-slate-500">{item.year}</p>
            <h3 className="mt-3 text-xl font-semibold text-slate-900">{item.carrera || item.career}</h3>
            <p className="mt-2 text-3xl font-bold text-sky-600">{item.index}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
