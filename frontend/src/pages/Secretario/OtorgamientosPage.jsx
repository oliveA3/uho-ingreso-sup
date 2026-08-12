export default function SecretarioOtorgamientosPage() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Otorgamientos</h1>
      <p className="mt-2 text-sm text-slate-600">Lista de otorgamientos por estudiante, carrera y CES.</p>

      <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-100 text-slate-500">
            <tr>
              <th className="px-4 py-3">Estudiante</th>
              <th className="px-4 py-3">Índice general</th>
              <th className="px-4 py-3">Índice otorgamiento</th>
              <th className="px-4 py-3">Carrera</th>
              <th className="px-4 py-3">CES</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            <tr>
              <td className="px-4 py-4 font-medium text-slate-900">Valentina Castro</td>
              <td className="px-4 py-4 text-slate-600">93.4</td>
              <td className="px-4 py-4 text-slate-600">92.1</td>
              <td className="px-4 py-4 text-slate-600">Ingeniería</td>
              <td className="px-4 py-4 text-slate-600">CES 1</td>
            </tr>
            <tr>
              <td className="px-4 py-4 font-medium text-slate-900">Diego Santos</td>
              <td className="px-4 py-4 text-slate-600">90.8</td>
              <td className="px-4 py-4 text-slate-600">89.7</td>
              <td className="px-4 py-4 text-slate-600">Medicina</td>
              <td className="px-4 py-4 text-slate-600">CES 2</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end">
        <button className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700">Exportar Excel</button>
      </div>
    </div>
  );
}
