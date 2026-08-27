import { useEffect, useState } from "react";
import HeroSection from "../components/HeroSection";
import StageBanner from "../components/StageBanner";
import ProcessTimeline from "../components/ProcessTimeline";
import NewsSection from "../components/NewsSection";
import PlanPlazasSection from "../components/PlanPlazasSection";
import CutoffSection from "../components/CutoffSection";
import OfferingsSection from "../components/OfferingsSection";
import { newsItems, planPlazas, cutoffIndices, offerings } from "../data/landingData";
import { fetchLandingData } from "../services/api";

const stageTitles = {
  1: "Escalafón",
  2: "Boleta de Interés",
  3: "Plan de Plazas y Solicitud",
  4: "Confirmación de Pruebas",
  5: "Resultados de Exámenes",
  6: "Otorgamiento de Carrera",
};

function toTimelineStep(stage) {
  return {
    id: stage.id,
    number: stage.numero,
    title: stageTitles[stage.numero] || stage.nombre,
    status: stage.estado === "completada" ? "done" : stage.estado === "en_curso" ? "act" : stage.estado === "bloqueada" ? "blocked" : "pending",
    date: stage.fecha_inicio ? `${stage.fecha_inicio} - ${stage.fecha_fin}` : "Sin fechas",
  };
}

export default function LandingPage() {
  const [processData, setProcessData] = useState(null);

  useEffect(() => {
    let active = true;
    const loadProcess = () => fetchLandingData().then((data) => {
      if (active) setProcessData(data);
    }).catch(() => {
      if (active) setProcessData({ etapas: [], error: true });
    });
    loadProcess();
    const interval = window.setInterval(loadProcess, 30000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const stages = processData?.etapas || [];
  const activeStage = stages.find((stage) => stage.estado === "en_curso");
  const landingStage = activeStage
    ? {
        label: `Etapa ${activeStage.numero} — ${stageTitles[activeStage.numero] || activeStage.nombre}`,
        description: activeStage.nombre,
        status: "En curso",
        dates: `${activeStage.fecha_inicio} al ${activeStage.fecha_fin}`,
        active: true,
      }
    : {
        label: "No hay una etapa activa",
        description: "El proceso de ingreso se actualizará cuando se active la próxima etapa.",
        status: "En espera",
        dates: "Sin fechas",
        active: false,
      };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">

      <main className="flex-1 space-y-5 py-5 px-4 sm:px-6 lg:px-8">
        <HeroSection />
        <StageBanner stage={landingStage} />
        {processData?.error && <p className="text-sm text-rose-700">No se pudo actualizar el estado del proceso.</p>}
        {stages.length > 0 && <ProcessTimeline steps={stages.map(toTimelineStep)} />}
        <div className="space-y-5">
          <NewsSection items={newsItems} />
          <PlanPlazasSection items={planPlazas} />
          <CutoffSection items={cutoffIndices} />
          <OfferingsSection items={offerings} />
        </div>
      </main>
    </div>
  );
}
