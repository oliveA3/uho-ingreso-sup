export default function SecretarioSinCuentaPage() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Estudiantes Sin Cuenta</h1>
        <p className="mt-2 text-sm text-slate-600">
          Lista de estudiantes que aún no han creado cuenta para que puedas gestionar su acceso.
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-100 text-slate-500">
            <tr>
              <th className="px-4 py-3">CI</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Índice general</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            <tr>
              <td className="px-4 py-4">...5498</td>
              <td className="px-4 py-4 font-medium text-slate-900">José Ramírez</td>
              <td className="px-4 py-4 text-slate-600">85.3</td>
            </tr>
            <tr>
              <td className="px-4 py-4">...6672</td>
              <td className="px-4 py-4 font-medium text-slate-900">Yamila Hernández</td>
              <td className="px-4 py-4 text-slate-600">88.1</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
