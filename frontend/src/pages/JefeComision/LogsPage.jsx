import { useEffect, useState } from "react";
import { fetchAuditLogs, getAuditLogExportUrl } from "../../services/api";
import FeedbackMessage from "../../components/FeedbackMessage";

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState({ usuario: "", accion: "", fecha_desde: "", fecha_hasta: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAuditLogs(filters).then((data) => setLogs(data.logs)).catch((requestError) => setError(requestError.message));
  }, [filters]);

  function exportLogs(format) {
    window.open(getAuditLogExportUrl(format), "_blank");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700">Registros</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Logs de Auditoría</h1>
          <p className="mt-3 text-sm text-slate-600">Filtra acciones por usuario, fecha, módulo o acción y exporta la auditoría.</p>
          {error && <FeedbackMessage type="error" className="mt-4 rounded-xl">{error}</FeedbackMessage>}
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[["usuario", "Usuario"], ["accion", "Acción"], ["fecha_desde", "Desde"], ["fecha_hasta", "Hasta"]].map(([field, label]) => (
              <label key={field} className="text-sm text-slate-600">{label}<input type={field.startsWith("fecha") ? "date" : "search"} value={filters[field]} onChange={(event) => setFilters({ ...filters, [field]: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" /></label>
            ))}
          </div>
          <div className="mt-4 flex gap-3"><button type="button" onClick={() => exportLogs("xlsx")} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Exportar Excel</button><button type="button" onClick={() => exportLogs("pdf")} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Exportar PDF</button></div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="table-scroll overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100 text-left text-slate-700">
              <th className="border-b border-slate-200 px-4 py-3">Fecha y hora</th>
              <th className="border-b border-slate-200 px-4 py-3">Usuario</th>
              <th className="border-b border-slate-200 px-4 py-3">Rol</th>
              <th className="border-b border-slate-200 px-4 py-3">Módulo</th>
              <th className="border-b border-slate-200 px-4 py-3">Acción</th>
              <th className="border-b border-slate-200 px-4 py-3">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-slate-200 hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-700">{new Date(log.created_at).toLocaleString()}</td>
                <td className="px-4 py-3 text-slate-700">{log.usuario_nombre}</td>
                <td className="px-4 py-3 text-slate-700">{log.rol}</td>
                <td className="px-4 py-3 text-slate-700">{log.modulo}</td>
                <td className="px-4 py-3 text-slate-700">{log.accion}</td>
                <td className="px-4 py-3 text-slate-700">{log.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </section>
    </div>
  );
}
