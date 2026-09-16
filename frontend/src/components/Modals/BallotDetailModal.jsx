import Modal from "./Modal";
import CareerPreferenceList from "../CareerPreferenceList/CareerPreferenceList";
import styles from "./BallotDetailModal.module.css";

export default function BallotDetailModal({ ballot, onClose }) {
  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
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
