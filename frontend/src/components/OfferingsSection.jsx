export default function OfferingsSection({ items }) {
  return (
    <section id="ofertas" className="mb-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">Carreras ofertadas</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Universidades y programas del territorio</h2>
        </div>
      </div>
      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-900">{item.title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
            <p className="mt-4 text-sm font-semibold text-slate-700">{item.institution}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
