import { useEffect, useMemo, useState } from "react";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import BallotDetailModal from "../../components/Modals/BallotDetailModal";
import EntityActionButton from "../../components/Buttons/EntityActionButton";
import SecondaryButton from "../../components/Buttons/SecondaryButton";
import StageStatusNotice from "../../components/StageStatusNotice/StageStatusNotice";
import { fetchCommissionPendingModifications, resolveCommissionModification } from "../../api/provincial.service";
import { Card, DataTable, StatCard, StatsGrid, useConfirm } from "../../components";
import styles from "./SolicitudesPage.module.css";

export default function SolicitudesPage() {
  const confirm = useConfirm();
  const [data, setData] = useState({ items: [], metrics: { total: 0, pendientes: 0 } });
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [selectedBallot, setSelectedBallot] = useState(null);
  const [stageStatus, setStageStatus] = useState(null);
  const stageFinished = stageStatus === "completada";

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
    const ok = await confirm({
      title: action === "approve" ? "Aprobar modificación" : "Rechazar modificación",
      message:
        action === "approve"
          ? "¿Deseas aprobar esta modificación de boleta? El estudiante no podrá volver a solicitarla."
          : "¿Deseas rechazar esta modificación de boleta? Esta acción no se puede deshacer.",
      confirmLabel: action === "approve" ? "Aprobar" : "Rechazar",
      tone: action === "approve" ? "default" : "danger",
    });
    if (!ok) return;
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

  const columns = [
    { key: "estudiante", header: "Estudiante", render: (mod) => mod.student },
    { key: "escuela", header: "Escuela", render: (mod) => mod.school },
    { key: "municipio", header: "Municipio", render: (mod) => mod.municipio },
    { key: "solicitado", header: "Solicitado", render: (mod) => mod.date },
    ...(stageFinished
      ? []
      : [
          {
            key: "accion",
            header: "Acción",
            render: (mod) => (
              <div className={styles.actionsCell}>
                <SecondaryButton onClick={() => setSelectedBallot(mod)}>Ver boleta</SecondaryButton>
                <EntityActionButton variant="edit" disabled={processingId === mod.id} onClick={() => respond(mod.id, "approve")}>Aprobar</EntityActionButton>
                <EntityActionButton variant="delete" disabled={processingId === mod.id} onClick={() => respond(mod.id, "reject")}>Rechazar</EntityActionButton>
              </div>
            ),
          },
        ]),
  ];

  return (
    <div className={styles.page}>
      <Card padding="p-8">
        <div>
          <p className={styles.eyebrow}>Solicitudes — Vista Provincial</p>
          <h1 className={styles.title}>Estado de boletas y modificaciones</h1>
        </div>

        <StageStatusNotice stageNumber={3} onStatusChange={setStageStatus} />
        <StatsGrid className="mt-6">
          <StatCard label="Aprobadas" value={total} tone="success" />
          <StatCard label="Pend. Comisión" value={data.metrics?.pendientes ?? 0} tone="warning" />
          <StatCard label="Mod. por aprobar" value={data.metrics?.pendientes ?? 0} tone="error" />
        </StatsGrid>
      </Card>

      {error && <FeedbackMessage type="error" className="rounded-2xl">{error}</FeedbackMessage>}
      {message && <FeedbackMessage type="success" className="rounded-2xl">{message}</FeedbackMessage>}

      <Card padding="p-8">
        <div className={styles.modificationsHeader}>
          <p className={styles.modificationsTitle}>Modificaciones pendientes</p>
        </div>

        <DataTable
          className="table-scroll mt-6"
          columns={columns}
          data={data.items}
          emptyMessage="No hay modificaciones pendientes."
        />
      </Card>
      {selectedBallot && <BallotDetailModal ballot={selectedBallot} onClose={() => setSelectedBallot(null)} />}
    </div>
  );
}
