export default function ConfirmedStudentsModal({ subject, students, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-20" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="confirmed-students-title" className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Estudiantes confirmados</p>
            <h2 id="confirmed-students-title" className="mt-1 text-xl font-semibold text-slate-900">{subject}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl px-3 py-1 text-xl text-slate-500" aria-label="Cerrar">&times;</button>
        </div>
        {students.length ? (
          <ul className="mt-5 divide-y divide-slate-200 rounded-2xl border border-slate-200">
            {students.map((student) => (
              <li key={student.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="font-medium text-slate-800">{student.name}</span>
                <span className="text-xs text-slate-500">{student.ci || "CI no disponible"}</span>
              </li>
            ))}
          </ul>
        ) : <p className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">No hay estudiantes confirmados para esta asignatura.</p>}
      </div>
    </div>
  );
}
