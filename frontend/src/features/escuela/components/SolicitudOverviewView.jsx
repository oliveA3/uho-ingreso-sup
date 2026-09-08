import { useState } from "react";
import BallotDetailModal from "../../../components/Modals/BallotDetailModal";
import StageStatusNotice from "../../../components/StageStatusNotice";
import BallotMetrics from "./BallotMetrics";

const statusStyles = {
  pendiente: { label: "Pendiente", className: "bg-amber-100 text-amber-700" },
  por_enviar: { label: "Por enviar", className: "bg-slate-100 text-slate-700" },
  aprobada: { label: "Aprobada", className: "bg-emerald-100 text-emerald-700" },
  modificada: { label: "Modificada", className: "bg-rose-100 text-rose-700" },
};

export default function SolicitudOverviewView({ data, title, canManage = false, canApprove = false, canDownload = false, readOnly = false, onApprove, onDownload }) {
  const [selectedBallot, setSelectedBallot] = useState(null);
  const metrics = data.metrics || {};
  const ballots = data.items || [];
  const showActions = (canManage && !readOnly || canDownload) && Boolean(onDownload || onApprove);
  return <div className="space-y-6">
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700">Boletas de Solicitud</p>
      <h1 className="mt-2 text-3xl font-semibold text-slate-900">{title}</h1>
      <p className="mt-3 text-sm text-slate-600">Resumen actualizado de las boletas de tu escuela.</p>
      <StageStatusNotice stageNumber={3} />
      <div className="mt-6">
        <BallotMetrics items={[
          { label: "Enviadas", value: metrics.enviadas, color: "text-sky-700" },
          { label: "Por aprobar", value: metrics.pendientes_aprobar ?? metrics.pendientes, color: "text-amber-700" },
          { label: "Modificadas", value: metrics.modificadas, color: "text-orange-700" },
          { label: "Aprobadas", value: metrics.aprobadas, color: "text-emerald-700" },
        ]} />
      </div>
    </section>
    
    <section className="rounded-3xl border border-slate-200 bg-white p-8">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-semibold text-slate-900">Boletas de la escuela</h2><p className="mt-1 text-sm text-slate-500">{ballots.length} boletas registradas</p></div></div>
      <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200"><table className="min-w-full divide-y divide-slate-200 text-left text-sm"><thead className="bg-slate-100 text-slate-500"><tr><th className="px-4 py-3">Estudiante</th><th className="px-4 py-3">Índice</th><th className="px-4 py-3">1ra opción</th><th className="px-4 py-3">Estado</th>{showActions && <th className="px-4 py-3">Acciones</th>}</tr></thead><tbody className="divide-y divide-slate-200 bg-white">{ballots.length ? ballots.map((ballot) => <tr key={ballot.id}><td className="px-4 py-4 font-medium text-slate-900">{ballot.student?.nombre} {ballot.student?.apellidos}</td><td className="px-4 py-4 text-slate-600">{ballot.student?.indice_general ?? "-"}</td><td className="px-4 py-4 text-slate-600">{ballot.items?.[0]?.carrera_nombre || "-"}</td><td className="px-4 py-4"><StatusBadge status={ballot.estado} /></td>{showActions && <td className="px-4 py-4"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setSelectedBallot(ballot)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold">Ver</button><button type="button" onClick={() => onDownload(ballot.id)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold">Descargar PDF</button>{canApprove && <button type="button" onClick={() => onApprove(ballot.id)} disabled={ballot.estado !== "pendiente"} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold disabled:opacity-50">Aprobar</button>}</div></td>}</tr>) : <tr><td colSpan={showActions ? "5" : "4"} className="px-4 py-10 text-center text-sm text-slate-500">No hay boletas de solicitud para mostrar.</td></tr>}</tbody></table></div>
    </section>
    {selectedBallot && <BallotDetailModal ballot={selectedBallot} onClose={() => setSelectedBallot(null)} />}

    <section className="rounded-3xl border border-slate-200 bg-white p-8">
      <h2 className="text-xl font-semibold text-slate-900">Top 10 carreras más solicitadas</h2>
      <Ranking items={metrics.top_carreras || []} />
    </section>

    <section className="grid gap-6 lg:grid-cols-2">
      <Distribution title="Distribución por sexo" items={metrics.sexo || []} />
      <Distribution title="Tipo de otorgamiento" items={metrics.tipo_otorgamiento || []} />
    </section>

  </div>;
}

function Ranking({ items }) {
  const maximum = Math.max(...items.map((item) => item.total), 1);
  return items.length ? <div className="mt-5 space-y-4">{items.map((item, index) => <div key={item.id}><div className="mb-1 flex justify-between gap-4 text-sm"><span className="truncate font-medium text-slate-700">{index + 1}. {item.nombre}</span><span className="font-semibold text-slate-900">{item.total}</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-sky-500" style={{ width: `${(item.total / maximum) * 100}%` }} /></div></div>)}</div> : <p className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">Aún no hay carreras solicitadas.</p>;
}

function Distribution({ title, items }) {
  const total = items.reduce((sum, item) => sum + item.total, 0);
  return <section className="rounded-3xl border border-slate-200 bg-white p-8"><h2 className="text-xl font-semibold text-slate-900">{title}</h2>{items.length ? <div className="mt-5 space-y-3">{items.map((item) => <div key={item.label} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"><span className="font-medium text-slate-700">{item.label}</span><span className="font-semibold text-slate-900">{item.total} <span className="text-xs font-normal text-slate-500">({total ? Math.round((item.total / total) * 100) : 0}%)</span></span></div>)}</div> : <p className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">Sin datos disponibles.</p>}</section>;
}

function StatusBadge({ status, modified }) {
  const effectiveStatus = status;
  const style = statusStyles[effectiveStatus] || { label: effectiveStatus || "Pendiente", className: "bg-slate-100 text-slate-700" };
  return <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${style.className}`}>{style.label}</span>;
}
