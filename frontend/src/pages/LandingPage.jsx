import { useEffect, useState } from "react";
import HeroSection from "../components/HeroSection";
import ProcessTimeline from "../components/ProcessTimeline";
import NewsSection from "../components/NewsSection";
import PlanPlazasModal from "../components/Modals/PlanPlazasModal";
import ResultadosModal from "../components/Modals/ResultadosModal";
import OtorgamientosModal from "../components/Modals/OtorgamientosModal";
import CutoffSection from "../components/CutoffSection";
import OfferingsSection from "../components/OfferingsSection";
import { newsItems, cutoffIndices } from "../data/landingData";
import { fetchLandingData } from "../services/api";
import { fetchLandingCortes } from "../services/api";

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

export default function LandingPage({ user }) {
  const [processData, setProcessData] = useState(null);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [resultadosModalOpen, setResultadosModalOpen] = useState(false);
  const [otorgamientosModalOpen, setOtorgamientosModalOpen] = useState(false);
  const [cortesData, setCortesData] = useState({ items: [], year: null });
  const [cortesModalOpen, setCortesModalOpen] = useState(false);

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

  useEffect(() => {
    fetchLandingCortes().then(setCortesData).catch(() => setCortesData({ items: [], year: null }));
  }, []);

  useEffect(() => {
    const openPlanModal = () => setPlanModalOpen(true);
    window.addEventListener("open-plan-plazas", openPlanModal);
    return () => window.removeEventListener("open-plan-plazas", openPlanModal);
  }, []);

  const stages = processData?.etapas || [];
  const activeStage = stages.find((stage) => stage.estado === "en_curso");
  const planData = processData?.plan_de_plazas || { items: [], years: [], provincias: [], provincia_nombre: "Todas" };
  const planYears = planData.years || [];
  const defaultProvinceName = planData.provincia_nombre || "Todas";
  const ces = planData.ces || processData?.ces || [];
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
        <HeroSection onViewPlan={() => setPlanModalOpen(true)} onViewResults={() => setResultadosModalOpen(true)} onViewAwards={() => setOtorgamientosModalOpen(true)} isAuthenticated={Boolean(user)} activeStageNumber={activeStage?.numero} />
        {processData?.error && <p className="text-sm text-rose-700">No se pudo actualizar el estado del proceso.</p>}
        {stages.length > 0 && <ProcessTimeline steps={stages.map(toTimelineStep)} />}
        
        <div className="space-y-5">
          <NewsSection items={newsItems} />
          <CutoffSection items={cortesData.items.length ? cortesData.items.slice(0, 4) : cutoffIndices} year={cortesData.year} onViewMore={() => setCortesModalOpen(true)} />
          <OfferingsSection items={ces} />
        </div>

        {planModalOpen && (
          <PlanPlazasModal
            items={planData.items || []}
            years={planYears}
            defaultProvince={defaultProvinceName}
            onClose={() => setPlanModalOpen(false)}
          />
        )}
        {resultadosModalOpen && <ResultadosModal onClose={() => setResultadosModalOpen(false)} />}
        {otorgamientosModalOpen && <OtorgamientosModal onClose={() => setOtorgamientosModalOpen(false)} />}
        {cortesModalOpen && <OtorgamientosModal mode="cortes" onClose={() => setCortesModalOpen(false)} />}
      </main>
    </div>
  );
}
