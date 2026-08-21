export default function UsuariosPage() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Usuarios</h1>
          <p className="mt-2 text-sm text-slate-600">
            Lista de directores y secretarios con filtros por rol, provincia y estado.
          </p>
        </div>
        <button className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
          Agregar usuario
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <input className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900" placeholder="Filtrar por rol" />
        <input className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900" placeholder="Filtrar por provincia" />
        <input className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900" placeholder="Filtrar por estado" />
      </div>

      <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-100 text-slate-500">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Escuela</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Correo</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            <tr>
              <td className="px-4 py-4 font-medium text-slate-900">Laura Gómez</td>
              <td className="px-4 py-4 text-slate-600">Escuela San Martín</td>
              <td className="px-4 py-4 text-slate-600">Secretaria</td>
              <td className="px-4 py-4 text-slate-600">laura.gomez@example.com</td>
              <td className="px-4 py-4 text-emerald-600">Activo</td>
              <td className="px-4 py-4">
                <button className="mr-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">Editar</button>
                <button className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">Eliminar</button>
              </td>
            </tr>
            <tr>
              <td className="px-4 py-4 font-medium text-slate-900">Pedro Álvarez</td>
              <td className="px-4 py-4 text-slate-600">Escuela Santa Rita</td>
              <td className="px-4 py-4 text-slate-600">Director</td>
              <td className="px-4 py-4 text-slate-600">pedro.alvarez@example.com</td>
              <td className="px-4 py-4 text-emerald-600">Activo</td>
              <td className="px-4 py-4">
                <button className="mr-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">Editar</button>
                <button className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">Eliminar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
