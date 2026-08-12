const etapas = [
  { title: "Etapa 1 — Escalafón", status: "Completada", dates: "10/01–20/01/2025" },
  { title: "Etapa 2 — Boleta de Interés", status: "En Curso", dates: "22/01–30/01/2025" },
  { title: "Etapa 3 — Plan de Plazas y Solicitud", status: "No Iniciada", dates: null },
  { title: "Etapa 4 — Confirmación Pruebas", status: "Bloqueada", dates: null },
  { title: "Etapa 5 — Resultados de Exámenes", status: "Bloqueada", dates: null },
  { title: "Etapa 6 — Otorgamiento de Carrera", status: "Bloqueada", dates: null },
];

export default function EtapasPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700">Control de Etapas</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Activación secuencial del proceso 2025</h1>
          <p className="mt-3 text-sm text-slate-600">Solo se puede activar la etapa inmediata después de la última en curso o completada.</p>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-emerald-50 p-5 text-sm text-emerald-700">
          ℹ️ Las etapas son secuenciales. Solo una activa a la vez. Al activar se notifica a todos los usuarios.
        </div>

        <div className="mt-6 space-y-4">
          {etapas.map((stage) => (
            <div key={stage.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{stage.title}</p>
                  {stage.dates && <p className="text-sm text-slate-600">{stage.dates}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {stage.status === "Completada" && <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Completada</span>}
                  {stage.status === "En Curso" && <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">En Curso</span>}
                  {stage.status === "No Iniciada" && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">No Iniciada</span>}
                  {stage.status === "Bloqueada" && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">Bloqueada</span>}
                  {stage.status === "En Curso" ? (
                    <button className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white">Cerrar</button>
                  ) : stage.status === "No Iniciada" ? (
                    <button className="rounded-2xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white">Activar</button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
