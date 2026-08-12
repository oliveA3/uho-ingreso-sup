export default function SecretarioEscalafonPage() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Escalafón</h1>
          <p className="mt-2 text-sm text-slate-600">
            Importa el escalafón desde Excel y gestiona el estado de los estudiantes.
          </p>
        </div>
        <button className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700">
          Subir Excel
        </button>
      </div>

      <div className="mt-6 space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">Lista de estudiantes con filtros y exportación.</p>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700">Exportar Excel</button>
            <button className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700">Enviar a comisión</button>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-100 text-slate-500">
              <tr>
                <th className="px-4 py-3">CI</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">10mo</th>
                <th className="px-4 py-3">11mo</th>
                <th className="px-4 py-3">12mo</th>
                <th className="px-4 py-3">Índice</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              <tr>
                <td className="px-4 py-4">...1847</td>
                <td className="px-4 py-4 font-medium text-slate-900">María González P.</td>
                <td className="px-4 py-4 text-slate-600">90.1</td>
                <td className="px-4 py-4 text-slate-600">93.2</td>
                <td className="px-4 py-4 text-slate-600">94.0</td>
                <td className="px-4 py-4 text-slate-600"><strong>92.4</strong></td>
                <td className="px-4 py-4 text-emerald-600">Aceptó</td>
                <td className="px-4 py-4">
                  <button className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold">Ver</button>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-4">...3312</td>
                <td className="px-4 py-4 font-medium text-slate-900">Ana Beatriz Vega L.</td>
                <td className="px-4 py-4 text-slate-600">93.8</td>
                <td className="px-4 py-4 text-slate-600">94.2</td>
                <td className="px-4 py-4 text-slate-600">94.1</td>
                <td className="px-4 py-4 text-slate-600"><strong>94.0</strong></td>
                <td className="px-4 py-4 text-amber-600">Revisión</td>
                <td className="px-4 py-4">
                  <button className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold">Ver</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
