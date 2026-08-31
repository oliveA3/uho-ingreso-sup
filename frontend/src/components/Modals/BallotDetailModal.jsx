export default function BallotDetailModal({ ballot, onClose }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-labelledby="ballot-modal-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
      <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Detalle de boleta</p><h2 id="ballot-modal-title" className="mt-1 text-xl font-semibold text-slate-900">{ballot.student?.nombre} {ballot.student?.apellidos}</h2></div><button type="button" onClick={onClose} className="rounded-xl px-3 py-1 text-xl text-slate-500" aria-label="Cerrar">&times;</button></div>
      {ballot.estado === "modificada" && <p className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">Esta boleta fue recientemente editada y está pendiente de aprobación.</p>}
      <ol className="mt-5 space-y-2">{(ballot.items || []).sort((first, second) => first.prioridad - second.prioridad).map((item) => <li key={item.id} className="flex gap-3 rounded-2xl border border-slate-200 p-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-semibold text-sky-700">{item.prioridad}</span><div><p className="font-semibold text-slate-900">{item.carrera_nombre}</p><p className="text-sm text-slate-500">{item.ces_nombre} · {item.provincia_nombre}</p></div></li>)}</ol>
    </div>
  </div>;
}
