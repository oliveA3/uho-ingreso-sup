import { useEffect, useState } from "react";
import { fetchLandingData } from "../services/api";

const stageTitles = {
  1: "Escalafón",
  2: "Boleta de Interés",
  3: "Plan de Plazas y Solicitud",
  4: "Confirmación de Pruebas",
  5: "Resultados de Exámenes",
  6: "Otorgamiento de Carrera",
};

export default function ActiveStageNotice() {
  const [activeStage, setActiveStage] = useState(null);

  useEffect(() => {
    let active = true;
    fetchLandingData()
      .then((data) => {
        const stage = data.etapas?.find((item) => item.estado === "en_curso");
        if (active) setActiveStage(stage || null);
      })
      .catch(() => {
        if (active) setActiveStage(null);
      });
    return () => { active = false; };
  }, []);

  if (!activeStage) return null;

  return (
    <div className="mt-6 rounded-3xl border border-slate-200 bg-emerald-50 p-5 text-sm text-emerald-700">
      ✅ Etapa activa: <strong>{stageTitles[activeStage.numero] || activeStage.nombre}</strong> — {activeStage.fecha_inicio} al {activeStage.fecha_fin}
    </div>
  );
}
