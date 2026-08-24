const rolePermissions = [
  ["Gestionar Provincias", ["✅", "❌", "❌", "❌", "❌", "❌", "❌"]],
  ["Crear Usuarios", ["✅", "❌", "✅", "✅", "❌", "❌", "❌"]],
  ["Activar Etapas", ["✅", "✅", "❌", "❌", "❌", "❌", "❌"]],
  ["Importar Escalafón", ["✅", "✅", "✅", "✅", "❌", "✅", "❌"]],
  ["Aprobar Boletas", ["✅", "✅", "✅", "✅", "❌", "✅", "❌"]],
  ["Ver Reportes Escuela", ["✅", "✅", "✅", "✅", "✅", "✅", "❌"]],
  ["Ver Logs Auditoría", ["✅", "✅", "❌", "❌", "❌", "❌", "❌"]],
  ["Llenar Boleta Solicitud", ["❌", "❌", "❌", "❌", "❌", "❌", "✅"]],
  ["Modificar Índice (excep.)", ["✅", "✅", "❌", "❌", "❌", "❌", "❌"]],
  ["Gestionar API Keys", ["✅", "❌", "❌", "❌", "❌", "❌", "❌"]],
];

export default function RolesPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">🔐 Roles y Permisos</h1>
            <p className="mt-2 text-sm text-slate-600">Matriz de control de acceso. Los permisos se verifican en el servidor en cada petición.</p>
          </div>
        </div>

        <div className="table-scroll mt-6 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 text-left text-slate-700">
                <th className="border-b border-slate-200 px-4 py-3">Permiso</th>
                <th className="border-b border-slate-200 px-4 py-3">SuperAdmin</th>
                <th className="border-b border-slate-200 px-4 py-3">Jefe Com.</th>
                <th className="border-b border-slate-200 px-4 py-3">Repr.Prov</th>
                <th className="border-b border-slate-200 px-4 py-3">Repr.Mun</th>
                <th className="border-b border-slate-200 px-4 py-3">Director</th>
                <th className="border-b border-slate-200 px-4 py-3">Secretario</th>
                <th className="border-b border-slate-200 px-4 py-3">Estudiante</th>
              </tr>
            </thead>
            <tbody>
              {rolePermissions.map(([permission, states]) => (
                <tr key={permission} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{permission}</td>
                  {states.map((state, index) => (
                    <td key={index} className="px-4 py-3 text-center text-slate-700">{state}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
