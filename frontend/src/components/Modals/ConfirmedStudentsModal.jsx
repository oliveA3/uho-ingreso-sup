import Modal from "./Modal";
import styles from "./ConfirmedStudentsModal.module.css";

export default function ConfirmedStudentsModal({ subject, students, onClose }) {
  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={
        <>
          <span className={styles.eyebrow}>Estudiantes confirmados</span>
          <span className={styles.name}>{subject}</span>
        </>
      }
    >
      {students.length ? (
        <ul className={styles.list}>
          {students.map((student) => (
            <li key={student.id} className={styles.listItem}>
              <span className={styles.studentName}>{student.name}</span>
              <span className={styles.studentCi}>{student.ci || "CI no disponible"}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>No hay estudiantes confirmados para esta asignatura.</p>
      )}
    </Modal>
  );
}
