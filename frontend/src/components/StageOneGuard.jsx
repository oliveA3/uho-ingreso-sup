import { useEffect, useState } from "react";
import { fetchProvincialEtapas } from "../services/api";

const allStagesActive = import.meta.env.VITE_ALL_STAGES_ACTIVE === "true";

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
    return <div className="p-6 text-sm text-slate-600">Verificando etapa activa...</div>;
  }
  if (!allowed) {
    return (
      <div className="relative">
        <div className="pointer-events-none select-none opacity-50 grayscale">
          {children}
        </div>
        <div className="absolute inset-0 z-10 flex items-start justify-center rounded-3xl bg-white/55 p-6 pt-16 backdrop-blur-[1px]">
          <div className="max-w-lg rounded-3xl border border-amber-200 bg-amber-50 p-6 text-center shadow-lg">
            <h1 className="text-2xl font-semibold text-amber-900">{panelName} no disponible</h1>
            <p className="mt-3 text-sm text-amber-800">
              Este panel se habilitará cuando la Etapa {stageNumber}, {stageName}, esté en curso.
            </p>
          </div>
        </div>
      </div>
    );
  }
  return children;
}
