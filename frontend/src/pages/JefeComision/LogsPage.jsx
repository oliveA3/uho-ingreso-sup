const logs = [
  { date: "2025-01-24", user: "r.linares", role: "Jefe Comisión", module: "Etapas", action: "Cerrar etapa", ip: "192.168.1.10" },
  { date: "2025-01-22", user: "r.linares", role: "Jefe Comisión", module: "Escalafones", action: "Exportar", ip: "192.168.1.10" },
];

export default function LogsPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700">Registros</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Logs de Auditoría</h1>
          <p className="mt-3 text-sm text-slate-600">Filtra acciones por usuario, fecha o módulo y exporta cambios importantes.</p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100 text-left text-slate-700">
              <th className="border-b border-slate-200 px-4 py-3">Fecha</th>
              <th className="border-b border-slate-200 px-4 py-3">Usuario</th>
              <th className="border-b border-slate-200 px-4 py-3">Rol</th>
              <th className="border-b border-slate-200 px-4 py-3">Módulo</th>
              <th className="border-b border-slate-200 px-4 py-3">Acción</th>
              <th className="border-b border-slate-200 px-4 py-3">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={`${log.date}-${log.user}`} className="border-b border-slate-200 hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-700">{log.date}</td>
                <td className="px-4 py-3 text-slate-700">{log.user}</td>
                <td className="px-4 py-3 text-slate-700">{log.role}</td>
                <td className="px-4 py-3 text-slate-700">{log.module}</td>
                <td className="px-4 py-3 text-slate-700">{log.action}</td>
                <td className="px-4 py-3 text-slate-700">{log.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
