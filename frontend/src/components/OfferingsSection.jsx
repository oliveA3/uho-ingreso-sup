import { useState } from "react";
import { getCesDetails } from "../data/cesDetails";

export default function OfferingsSection({ items = [] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const visibleItems = items.slice(0, 3);
  const enrich = (item) => ({ ...item, ...getCesDetails(item.nombre) });
  return (
    <section id="ofertas" className="mb-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">Centros de Educación Superior</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Instituciones del proceso de ingreso</h2>
        </div>
        {items.length > 3 && <button type="button" onClick={() => setModalOpen(true)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Ver más</button>}
      </div>
      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {visibleItems.map((rawItem) => {
          const item = enrich(rawItem);
          return (
          <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">{item.nombre}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">{item.carreras_count} carreras en el plan de plazas {item.plan_year || ""}.</p>
            <p className="mt-3 text-xs text-slate-500">Sede principal: {item.sedePrincipal}</p>
          </article>
          );
        })}
      </div>
      {modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setModalOpen(false)}>
        <section role="dialog" aria-modal="true" aria-labelledby="ces-list-title" className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Catálogo público</p>
              <h2 id="ces-list-title" className="mt-1 text-2xl font-semibold text-slate-900">Centros de Educación Superior</h2>
            </div>
            <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl px-3 py-1 text-xl text-slate-500" aria-label="Cerrar">&times;</button>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {items.map((rawItem) => { const item = enrich(rawItem); return <article key={item.id} className="flex flex-col rounded-2xl bg-slate-50 p-5">
              <h3 className="text-lg font-semibold text-slate-900">{item.nombre}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
              <dl className="mt-3 space-y-2 border-t border-slate-200 pt-3 text-xs text-slate-600">
                <div><dt className="inline font-semibold text-slate-800">Carreras en el plan {item.plan_year || ""}: </dt><dd className="inline">{item.carreras_count}</dd></div>
                <div><dt className="inline font-semibold text-slate-800">Sede principal: </dt><dd className="inline">{item.sedePrincipal}</dd></div>
                <div><dt className="inline font-semibold text-slate-800">Sedes: </dt><dd className="inline leading-5">{item.sedes}</dd></div>
              </dl>
              <div className="mt-5">{item.website && <a href={item.website} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700">Visitar sitio oficial <span className="ml-2" aria-hidden="true">↗</span></a>}</div>
            </article>; })}
          </div>
        </section>
      </div>}
    </section>
  );
}
