export default function DashboardPage() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard Repr. Municipal</h1>
          <p className="mt-2 text-sm text-slate-600">
            Resumen general de escuelas, secretarios y directores.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Escuelas</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">28</p>
            <p className="mt-2 text-sm text-slate-500">Registros totales</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Secretarios</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">14</p>
            <p className="mt-2 text-sm text-slate-500">Activos</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Directores</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">16</p>
            <p className="mt-2 text-sm text-slate-500">Activos</p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Escuelas</h2>
              <p className="mt-1 text-sm text-slate-600">
                Lista de escuelas con cantidad de estudiantes, secretario, director y estado.
              </p>
            </div>
            <button className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
              Agregar escuela
            </button>
          </div>

          <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-100 text-slate-500">
                <tr>
                  <th className="px-4 py-3">Escuela</th>
                  <th className="px-4 py-3">Estudiantes</th>
                  <th className="px-4 py-3">Secretario</th>
                  <th className="px-4 py-3">Director</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                <tr>
                  <td className="px-4 py-4 font-medium text-slate-900">Escuela San Martín</td>
                  <td className="px-4 py-4 text-slate-600">420</td>
                  <td className="px-4 py-4 text-slate-600">María López</td>
                  <td className="px-4 py-4 text-slate-600">Carlos Díaz</td>
                  <td className="px-4 py-4 text-emerald-600">Activa</td>
                </tr>
                <tr>
                  <td className="px-4 py-4 font-medium text-slate-900">Escuela Santa Rita</td>
                  <td className="px-4 py-4 text-slate-600">310</td>
                  <td className="px-4 py-4 text-slate-600">Luis Pérez</td>
                  <td className="px-4 py-4 text-slate-600">Ana Méndez</td>
                  <td className="px-4 py-4 text-amber-600">Pendiente</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
