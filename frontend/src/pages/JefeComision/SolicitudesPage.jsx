import { useEffect, useMemo, useState } from "react";
import FeedbackMessage from "../../components/FeedbackMessage";
import BallotDetailModal from "../../components/Modals/BallotDetailModal";
import EntityActionButton from "../../components/Buttons/EntityActionButton";
import SecondaryButton from "../../components/Buttons/SecondaryButton";
import { fetchCommissionPendingModifications, resolveCommissionModification } from "../../services/api";

export default function SolicitudesPage() {
  const [data, setData] = useState({ items: [], metrics: { total: 0, pendientes: 0 } });
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [selectedBallot, setSelectedBallot] = useState(null);

  const loadData = async () => {
    try {
      const result = await fetchCommissionPendingModifications();
      setData({ items: result.items || [], metrics: result.metrics || { total: 0, pendientes: 0 } });
      setError(null);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const total = useMemo(() => data.metrics?.aprobadas ?? data.metrics?.total ?? 0, [data]);

  const respond = async (id, action) => {
    try {
      setProcessingId(id);
      await resolveCommissionModification(id, action);
      setMessage(action === "approve" ? "Modificación aprobada." : "Modificación rechazada.");
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700">Solicitudes — Vista Provincial</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Estado de boletas y modificaciones</h1>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-emerald-50 p-6 text-center">
            <p className="text-sm text-slate-600">Aprobadas</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{total}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-amber-50 p-6 text-center">
            <p className="text-sm text-slate-600">Pend. Comisión</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{data.metrics?.pendientes ?? 0}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-rose-50 p-6 text-center">
            <p className="text-sm text-slate-600">Mod. por aprobar</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{data.metrics?.pendientes ?? 0}</p>
          </div>
        </div>
      </section>

      {error && <FeedbackMessage type="error" className="rounded-2xl">{error}</FeedbackMessage>}
      {message && <FeedbackMessage type="success" className="rounded-2xl">{message}</FeedbackMessage>}

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">Modificaciones pendientes</p>
        </div>

        <div className="table-scroll mt-6 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 text-left text-slate-700">
                <th className="border-b border-slate-200 px-4 py-3">Estudiante</th>
                <th className="border-b border-slate-200 px-4 py-3">Escuela</th>
                <th className="border-b border-slate-200 px-4 py-3">Municipio</th>
                <th className="border-b border-slate-200 px-4 py-3">Solicitado</th>
                <th className="border-b border-slate-200 px-4 py-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {data.items.length ? data.items.map((mod) => (
                <tr key={mod.id} className="border-b border-slate-200 align-top hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700">{mod.student}</td>
                  <td className="px-4 py-3 text-slate-700">{mod.school}</td>
                  <td className="px-4 py-3 text-slate-700">{mod.municipio}</td>
                  <td className="px-4 py-3 text-slate-700">{mod.date}</td>
                  <td className="px-4 py-3 text-slate-700">
                    <div className="flex flex-wrap gap-2">
                      <SecondaryButton onClick={() => setSelectedBallot(mod)}>Ver boleta</SecondaryButton>
                      <EntityActionButton
                        variant="edit"
                        disabled={processingId === mod.id}
                        onClick={() => respond(mod.id, "approve")}
                      >
                        Aprobar
                      </EntityActionButton>
                      <EntityActionButton
                        variant="delete"
                        disabled={processingId === mod.id}
                        onClick={() => respond(mod.id, "reject")}
                      >
                        Rechazar
                      </EntityActionButton>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="px-4 py-10 text-center text-sm text-slate-500">No hay modificaciones pendientes.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      {selectedBallot && <BallotDetailModal ballot={selectedBallot} onClose={() => setSelectedBallot(null)} />}
    </div>
  );
}
