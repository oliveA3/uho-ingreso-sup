export default function SecretarioBoletasSolicitudPage() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Boletas de Solicitud</h1>
      <p className="mt-2 text-sm text-slate-600">Gestión de boletas, aprobaciones y modificaciones pendientes.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Enviadas</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">24</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Pendientes</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">8</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Aprobadas</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">15</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Modificaciones</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">3</p>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-100 text-slate-500">
            <tr>
              <th className="px-4 py-3">Estudiante</th>
              <th className="px-4 py-3">Índice</th>
              <th className="px-4 py-3">1ra opción</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            <tr>
              <td className="px-4 py-4 font-medium text-slate-900">Lucía Pérez</td>
              <td className="px-4 py-4 text-slate-600">95.2</td>
              <td className="px-4 py-4 text-slate-600">Medicina</td>
              <td className="px-4 py-4 text-emerald-600">Aprobada</td>
              <td className="px-4 py-4">
                <button className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold">Ver</button>
              </td>
            </tr>
            <tr>
              <td className="px-4 py-4 font-medium text-slate-900">Daniela Ruiz</td>
              <td className="px-4 py-4 text-slate-600">90.4</td>
              <td className="px-4 py-4 text-slate-600">Ingeniería</td>
              <td className="px-4 py-4 text-amber-600">Pendiente</td>
              <td className="px-4 py-4">
                <button className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold">Revisar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
