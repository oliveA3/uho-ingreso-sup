import { useEffect, useState } from "react";
import { approveSchoolSolicitud, fetchSchoolSolicitudes } from "../../services/api";

export default function SecretarioBoletasSolicitudPage() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetchSchoolSolicitudes().then((data) => setItems(data.items || []));
  }, []);

  const approve = async (id) => {
    await approveSchoolSolicitud(id);
    setItems((current) => current.map((item) => item.id === id ? { ...item, estado: "aprobada" } : item));
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Boletas de Solicitud</h1>
      <p className="mt-2 text-sm text-slate-600">Gestión de boletas, aprobaciones y modificaciones pendientes.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Enviadas</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{items.length}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Pendientes</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{items.filter((item) => item.estado === "por_aprobar").length}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Aprobadas</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{items.filter((item) => item.estado === "aprobada").length}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Modificaciones</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">0</p>
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
                {items.map((item) => <tr key={item.id}>
                  <td className="px-4 py-4 font-medium text-slate-900">{item.student?.nombre} {item.student?.apellidos}</td>
                  <td className="px-4 py-4 text-slate-600">{item.student?.indice_general ?? "-"}</td>
                  <td className="px-4 py-4 text-slate-600">{item.items?.[0]?.carrera_nombre || "-"}</td>
                  <td className="px-4 py-4 text-slate-600">{item.estado}</td>
                  <td className="px-4 py-4"><button type="button" onClick={() => approve(item.id)} disabled={item.estado !== "por_aprobar"} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold disabled:opacity-50">Aprobar</button></td>
                </tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
