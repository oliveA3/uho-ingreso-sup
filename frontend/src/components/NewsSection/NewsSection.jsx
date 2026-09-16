export default function NewsSection({ items }) {
  return (
    <section id="noticias" className="mb-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">Noticias</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Actualizaciones del proceso de ingreso</h2>
        </div>
      </div>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {items.map((item) => (
          <article key={item.id} className="group overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <div className="mb-4 h-48 overflow-hidden rounded-2xl bg-slate-100">
              {item.mediaType === "imagen" ? (
                <img className="h-full w-full object-cover" src={item.mediaUrl} alt={item.title} />
              ) : (
                <div className="flex h-full items-center justify-center bg-slate-100 text-slate-500">{item.mediaType}</div>
              )}
            </div>
            <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.24em] text-slate-500">
              <span>{item.category}</span>
              <span>{item.date}</span>
            </div>
            <h3 className="text-xl font-semibold text-slate-900">{item.title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
