export default function ProcessTimeline({ steps }) {
  return (
    <section className="mb-12 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">Cronograma</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Etapas del proceso de ingreso</h2>
        </div>
        <p className="text-sm text-slate-500">Mobile-first y accesible según WCAG 2.1.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {steps.map((step) => {
          const statusStyles = step.status === "done" ? "border-emerald-400 bg-emerald-50" : step.status === "act" ? "border-sky-400 bg-sky-50" : "border-slate-200 bg-slate-50";
          return (
            <div key={step.id} className={`rounded-3xl border p-5 ${statusStyles}`}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-700">
                  {step.number}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                  <p className="text-xs text-slate-500">{step.date}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
