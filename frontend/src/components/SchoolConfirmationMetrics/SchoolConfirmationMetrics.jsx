import { useState } from "react";
import ConfirmedStudentsModal from "./Modals/ConfirmedStudentsModal";
import EntityActionButton from "./Buttons/EntityActionButton";
import StageStatusNotice from "./StageStatusNotice";

export default function SchoolConfirmationMetrics({ data, title }) {
  const [selectedSubject, setSelectedSubject] = useState(null);
  const subjects = data.subjects || [];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">Estado de las pruebas de ingreso de tu escuela en {data.year}.</p>
        <StageStatusNotice stageNumber={4} />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {subjects.map((subject) => (
            <div key={subject.name} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">{subject.name}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <span className="rounded-xl bg-amber-100 p-2 text-amber-700"><strong className="block text-xl">{subject.pending}</strong>Pendientes</span>
                <span className="rounded-xl bg-emerald-100 p-2 text-emerald-700"><strong className="block text-xl">{subject.confirmed}</strong>Confirmados</span>
                <span className="rounded-xl bg-rose-100 p-2 text-rose-700"><strong className="block text-xl">{subject.rejected}</strong>Rechazados</span>
              </div>
              <EntityActionButton variant="edit" className="mt-4 w-full" onClick={() => setSelectedSubject(subject)}>Ver confirmados</EntityActionButton>
            </div>
          ))}
        </div>
        {!subjects.length && <p className="mt-6 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">No hay confirmaciones disponibles para este año.</p>}
      </section>
      {selectedSubject && <ConfirmedStudentsModal subject={selectedSubject.name} students={selectedSubject.confirmed_students} onClose={() => setSelectedSubject(null)} />}
    </div>
  );
}
