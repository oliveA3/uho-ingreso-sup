const usuarios = [
  { name: "Luis Torres R.", municipality: "Holguín", email: "luis.torres@mined.cu", status: "Activo" },
  { name: "Ana López M.", municipality: "Gibara", email: "ana.lopez@mined.cu", status: "Activo" },
];

export default function UsuariosPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700">Usuarios</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Representantes municipales</h1>
            <p className="mt-2 text-sm text-slate-600">Filtra por municipio, correo o estado.</p>
          </div>
          <button className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700">+ Nuevo</button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100 text-left text-slate-700">
              <th className="border-b border-slate-200 px-4 py-3">Nombre</th>
              <th className="border-b border-slate-200 px-4 py-3">Municipio</th>
              <th className="border-b border-slate-200 px-4 py-3">Correo</th>
              <th className="border-b border-slate-200 px-4 py-3">Estado</th>
              <th className="border-b border-slate-200 px-4 py-3">Acc.</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((user) => (
              <tr key={user.email} className="border-b border-slate-200 hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-700">{user.name}</td>
                <td className="px-4 py-3 text-slate-700">{user.municipality}</td>
                <td className="px-4 py-3 text-slate-700">{user.email}</td>
                <td className="px-4 py-3 text-slate-700">
                  <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">{user.status}</span>
                </td>
                <td className="px-4 py-3 space-x-2">
                  <button className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">✏️</button>
                  <button className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">🔒</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
