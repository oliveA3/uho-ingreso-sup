import styles from "./ProcessTimeline.module.css";

const stepStatusClass = {
  done: "stepDone",
  act: "stepActive",
  blocked: "stepBlocked",
};

export default function ProcessTimeline({ steps }) {
  return (
    <section id="cronograma" className={styles.section}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Cronograma</p>
          <h2 className={styles.title}>Etapas del proceso de ingreso</h2>
        </div>
      </div>
      <div className={styles.grid}>
        {steps.map((step) => {
          const statusClass = styles[stepStatusClass[step.status]] || styles.stepDefault;
          const statusLabel = step.status === "done" ? "Completada" : step.status === "act" ? "En curso" : "";
          return (
            <div key={step.id} className={`${styles.step} ${statusClass}`}>
              <div className={styles.stepContent}>
                <div className={`${styles.stepNumber} ${step.status === "act" ? styles.stepNumberActive : ""}`}>
                  {step.number}
                </div>
                <div>
                  <p className={styles.stepTitle}>{step.title}</p>
                  <p className={styles.stepDate}>{step.date}{statusLabel && ` · ${statusLabel}`}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
