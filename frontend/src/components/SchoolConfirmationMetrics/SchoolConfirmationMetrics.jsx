import { useState } from "react";
import ConfirmedStudentsModal from "../Modals/ConfirmedStudentsModal";
import EntityActionButton from "../Buttons/EntityActionButton";
import Card from "../Card/Card";
import StageStatusNotice from "../StageStatusNotice/StageStatusNotice";
import styles from "./SchoolConfirmationMetrics.module.css";

export default function SchoolConfirmationMetrics({ data, title }) {
  const [selectedSubject, setSelectedSubject] = useState(null);
  const subjects = data.subjects || [];

  return (
    <div className={styles.wrapper}>
      <Card as="section" padding="p-8">
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>Estado de las pruebas de ingreso de tu escuela en {data.year}.</p>
        <StageStatusNotice stageNumber={4} />
        <div className={styles.grid}>
          {subjects.map((subject) => (
            <div key={subject.name} className={styles.subjectCard}>
              <p className={styles.subjectName}>{subject.name}</p>
              <div className={styles.statsGrid}>
                <span className={styles.statPending}><strong className={styles.statValue}>{subject.pending}</strong>Pendientes</span>
                <span className={styles.statConfirmed}><strong className={styles.statValue}>{subject.confirmed}</strong>Confirmados</span>
                <span className={styles.statRejected}><strong className={styles.statValue}>{subject.rejected}</strong>Rechazados</span>
              </div>
              <EntityActionButton variant="edit" className={styles.viewButton} onClick={() => setSelectedSubject(subject)}>Ver confirmados</EntityActionButton>
            </div>
          ))}
        </div>
        {!subjects.length && <p className={styles.emptyMessage}>No hay confirmaciones disponibles para este año.</p>}
      </Card>
      {selectedSubject && <ConfirmedStudentsModal subject={selectedSubject.name} students={selectedSubject.confirmed_students} onClose={() => setSelectedSubject(null)} />}
    </div>
  );
}
