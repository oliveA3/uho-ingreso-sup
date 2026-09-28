import { useState } from "react";
import Modal from "./Modal";
import PrimaryButton from "../Buttons/PrimaryButton";
import CareerPreferenceList from "../CareerPreferenceList/CareerPreferenceList";
import styles from "./BallotDetailModal.module.css";

export default function BallotDetailModal({ ballot, onClose, onDownload }) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      await onDownload();
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      footer={onDownload && (
        <PrimaryButton onClick={handleDownload} disabled={downloading}>
          {downloading ? "Descargando..." : "Descargar PDF"}
        </PrimaryButton>
      )}
      title={
        <>
          <span className={styles.eyebrow}>Detalle de boleta</span>
          <span className={styles.name}>
            {ballot.student?.nombre} {ballot.student?.apellidos}
          </span>
        </>
      }
    >
      {ballot.estado === "modificada" && (
        <p className={styles.notice}>
          Esta boleta fue recientemente editada y está pendiente de aprobación.
        </p>
      )}
      <div className={styles.list}>
        <CareerPreferenceList items={ballot.items || []} />
      </div>
    </Modal>
  );
}
