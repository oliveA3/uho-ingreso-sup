export default function SecretarioDashboardPage() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard Secretario</h1>
          <p className="mt-2 text-sm text-slate-600">
            Resumen de etapa activa, estudiantes, boletas y escalafón para tu escuela.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Total Estudiantes</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">45</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Con cuenta</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">38</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Boletas enviadas</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">28</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Etapa activa</p>
            <p className="mt-3 text-xl font-semibold text-slate-900">Boleta de Interés</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-base font-semibold text-slate-900">Estado de Escalafón</h2>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Aceptaron</span>
                <span className="font-semibold text-slate-900">32</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200">
                <div className="h-2 rounded-full bg-emerald-500" style={{ width: "71%" }} />
              </div>
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Revisión</span>
                <span className="font-semibold text-slate-900">5</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200">
                <div className="h-2 rounded-full bg-amber-500" style={{ width: "11%" }} />
              </div>
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Sin respuesta</span>
                <span className="font-semibold text-slate-900">8</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200">
                <div className="h-2 rounded-full bg-slate-900" style={{ width: "18%" }} />
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-base font-semibold text-slate-900">Boleta de Interés</h2>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Enviadas</span>
                <span className="font-semibold text-slate-900">28</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200">
                <div className="h-2 rounded-full bg-emerald-500" style={{ width: "62%" }} />
              </div>
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Pendientes</span>
                <span className="font-semibold text-slate-900">17</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200">
                <div className="h-2 rounded-full bg-amber-500" style={{ width: "38%" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
