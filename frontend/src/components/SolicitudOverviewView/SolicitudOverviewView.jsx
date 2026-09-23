import { useState } from "react";
import BallotDetailModal from "../Modals/BallotDetailModal";
import StageStatusNotice from "../StageStatusNotice/StageStatusNotice";
import DataTable from "../DataTable/DataTable";
import BallotMetrics from "../BallotMetrics/BallotMetrics";
import styles from "./SolicitudOverviewView.module.css";

const statusStyles = {
  pendiente: { label: "Pendiente", className: styles.statusPendiente },
  por_enviar: { label: "Por enviar", className: styles.statusPorEnviar },
  aprobada: { label: "Aprobada", className: styles.statusAprobada },
  modificada: { label: "Modificada", className: styles.statusModificada },
};

export default function SolicitudOverviewView({ data, title, canManage = false, canApprove = false, canDownload = false, readOnly = false, onApprove, onDownload }) {
  const [selectedBallot, setSelectedBallot] = useState(null);
  const metrics = data.metrics || {};
  const ballots = data.items || [];
  const showActions = (canManage && !readOnly || canDownload) && Boolean(onDownload || onApprove);

  const columns = [
    {
      key: "student",
      header: "Estudiante",
      className: styles.studentCell,
      render: (ballot) => `${ballot.student?.nombre || ""} ${ballot.student?.apellidos || ""}`.trim(),
    },
    {
      key: "indice",
      header: "Índice",
      className: styles.indexCell,
      render: (ballot) => ballot.student?.indice_general ?? "-",
    },
    {
      key: "opcion",
      header: "1ra opción",
      className: styles.indexCell,
      render: (ballot) => ballot.items?.[0]?.carrera_nombre || "-",
    },
    {
      key: "estado",
      header: "Estado",
      render: (ballot) => <StatusBadge status={ballot.estado} />,
    },
    ...(showActions ? [{
      key: "acciones",
      header: "Acciones",
      render: (ballot) => (
        <div className={styles.actions}>
          <button type="button" onClick={() => setSelectedBallot(ballot)} className={styles.actionButton}>Ver</button>
          <button type="button" onClick={() => onDownload(ballot.id)} className={styles.actionButton}>Descargar PDF</button>
          {canApprove && (
            <button
              type="button"
              onClick={() => onApprove(ballot.id)}
              disabled={ballot.estado !== "pendiente"}
              className={styles.actionButton}
            >
              Aprobar
            </button>
          )}
        </div>
      ),
    }] : []),
  ];

  return (
    <div className={styles.wrapper}>
      <section className={styles.section}>
        <p className={styles.eyebrow}>Boletas de Solicitud</p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>Resumen actualizado de las boletas de tu escuela.</p>
        <StageStatusNotice stageNumber={3} />
        <div className={styles.metrics}>
          <BallotMetrics items={[
            { label: "Enviadas", value: metrics.enviadas, tone: "info" },
            { label: "Por aprobar", value: metrics.pendientes_aprobar ?? metrics.pendientes, tone: "warning" },
            { label: "Modificadas", value: metrics.modificadas, tone: "orange" },
            { label: "Aprobadas", value: metrics.aprobadas, tone: "success" },
          ]} />
        </div>
      </section>

      <section className={styles.sectionFlat}>
        <div className={styles.tableSectionHeader}>
          <div>
            <h2 className={styles.tableTitle}>Boletas de la escuela</h2>
            <p className={styles.tableCount}>{ballots.length} boletas registradas</p>
          </div>
        </div>
        <div className={styles.tableWrapper}>
          <DataTable
            columns={columns}
            data={ballots}
            emptyMessage="No hay boletas de solicitud para mostrar."
          />
        </div>
      </section>

      {selectedBallot && <BallotDetailModal ballot={selectedBallot} onClose={() => setSelectedBallot(null)} />}

      <section className={styles.sectionFlat}>
        <h2 className={styles.tableTitle}>Top 10 carreras más solicitadas</h2>
        <Ranking items={metrics.top_carreras || []} />
      </section>

      <section className={styles.distributionGrid}>
        <Distribution title="Distribución por sexo" items={metrics.sexo || []} />
        <Distribution title="Tipo de otorgamiento" items={metrics.tipo_otorgamiento || []} />
      </section>
    </div>
  );
}

function Ranking({ items }) {
  const maximum = Math.max(...items.map((item) => item.total), 1);

  return items.length ? (
    <div className={styles.rankingSection}>
      {items.map((item, index) => (
        <div key={item.id} className={styles.rankingItem}>
          <div className={styles.rankingRow}>
            <span className={styles.rankingName}>{index + 1}. {item.nombre}</span>
            <span className={styles.rankingValue}>{item.total}</span>
          </div>
          <div className={styles.barTrack}>
            <div className={styles.barFill} style={{ width: `${(item.total / maximum) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  ) : (
    <p className={styles.emptyText}>Aún no hay carreras solicitadas.</p>
  );
}

function Distribution({ title, items }) {
  const total = items.reduce((sum, item) => sum + item.total, 0);

  return (
    <section className={styles.sectionFlat}>
      <h2 className={styles.tableTitle}>{title}</h2>
      {items.length ? (
        <div className={styles.distributionList}>
          {items.map((item) => (
            <div key={item.label} className={styles.distributionRow}>
              <span className={styles.distributionLabel}>{item.label}</span>
              <span className={styles.distributionValue}>
                {item.total} <span className={styles.distributionPercent}>({total ? Math.round((item.total / total) * 100) : 0}%)</span>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.emptyText}>Sin datos disponibles.</p>
      )}
    </section>
  );
}

function StatusBadge({ status }) {
  const style = statusStyles[status] || { label: status || "Pendiente", className: styles.statusPorEnviar };
  return <span className={`${styles.statusBadge} ${style.className}`}>{style.label}</span>;
}
