import { useEffect, useState } from "react";
import { fetchProvincialEtapas } from "../../api/provincial.service";
import styles from "./StageOneGuard.module.css";

const allStagesActive = import.meta.env.DEV || import.meta.env.VITE_ALL_STAGES_ACTIVE === "true";

export default function StageOneGuard({
  children,
  stageNumber = 1,
  stageName = "Publicación y validación del escalafón",
  panelName = "Esta sección",
}) {
  const [allowed, setAllowed] = useState(null);

  useEffect(() => {
    if (allStagesActive) {
      setAllowed(true);
      return;
    }
    fetchProvincialEtapas()
      .then((stages) => setAllowed(stages.some((stage) => stage.numero === stageNumber && stage.estado === "en_curso")))
      .catch(() => setAllowed(false));
  }, []);

  if (allowed === null) {
    return <div className={styles.checking}>Verificando etapa activa...</div>;
  }
  if (!allowed) {
    return (
      <div className={styles.container}>
        <div className={styles.overlay}>
          <div className={styles.panel}>
            <h1 className={styles.panelTitle}>{panelName} no disponible</h1>
            <p className={styles.panelText}>
              Este panel se habilitará cuando la Etapa {stageNumber}, {stageName}, esté en curso.
            </p>
          </div>
        </div>
      </div>
    );
  }
  return children;
}
