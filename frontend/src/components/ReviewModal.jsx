export default function ReviewModal({ cause, onCauseChange, onCancel, onSubmit }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Solicitar revisión</h2>
            <p className="mt-1 text-sm text-slate-600">Describe por qué deseas revisar tus índices.</p>
          </div>
          <button type="button" onClick={onCancel} className="text-xl text-slate-500" aria-label="Cerrar">&times;</button>
        </div>
        <textarea
          autoFocus
          value={cause}
          onChange={onCauseChange}
          placeholder="Causa de la revisión"
          className="mt-5 min-h-32 w-full rounded-xl border border-slate-200 p-3 text-sm"
        />
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancelar</button>
          <button type="button" onClick={onSubmit} disabled={!cause.trim()} className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Enviar solicitud</button>
        </div>
      </div>
    </div>
  );
}
