const users = [
  { username: "r.linares", name: "Dr. Roberto Linares", role: "Jefe Comisión", scope: "Holguín", status: "Activo" },
  { username: "m.infante", name: "Lic. Marta Infante", role: "Repr. Prov.", scope: "Holguín", status: "Activo" },
  { username: "caridad.rodriguez", name: "Caridad Rodríguez", role: "Secretario", scope: "IPVCE F. Engels", status: "Activo" },
];

export default function UsuariosPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">👥 Usuarios</h1>
            <p className="mt-2 text-sm text-slate-600">Gestión global de usuarios en todo el sistema.</p>
          </div>
          <button type="button" className="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700">
            + Nuevo usuario
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Rol", value: "Todos" },
            { label: "Provincia", value: "Todas" },
            { label: "Estado", value: "Todos" },
          ].map((filter) => (
            <label key={filter.label} className="space-y-2 text-sm text-slate-700">
              {filter.label}
              <select className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none">
                <option>{filter.value}</option>
              </select>
            </label>
          ))}
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 text-left text-slate-700">
                <th className="border-b border-slate-200 px-4 py-3">Usuario</th>
                <th className="border-b border-slate-200 px-4 py-3">Nombre</th>
                <th className="border-b border-slate-200 px-4 py-3">Rol</th>
                <th className="border-b border-slate-200 px-4 py-3">Alcance</th>
                <th className="border-b border-slate-200 px-4 py-3">Estado</th>
                <th className="border-b border-slate-200 px-4 py-3">Acc.</th>
              </tr>
            </thead>
            <tbody>
              {users.map((userRow) => (
                <tr key={userRow.username} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700">{userRow.username}</td>
                  <td className="px-4 py-3 text-slate-700">{userRow.name}</td>
                  <td className="px-4 py-3 text-slate-700"><span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">{userRow.role}</span></td>
                  <td className="px-4 py-3 text-slate-700">{userRow.scope}</td>
                  <td className="px-4 py-3 text-slate-700"><span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">{userRow.status}</span></td>
                  <td className="px-4 py-3 text-slate-700">
                    <button className="mr-2 inline-flex rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">✏️</button>
                    <button className="inline-flex rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">🔒</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
