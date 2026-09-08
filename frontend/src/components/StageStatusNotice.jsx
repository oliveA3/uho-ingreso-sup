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

export default function StageStatusNotice({ stageNumber = null, onStatusChange }) {
  const [stages, setStages] = useState([]);

  useEffect(() => {
    let mounted = true;
    fetchLandingData()
      .then((data) => {
        if (mounted) {
          const nextStages = data.etapas || [];
          setStages(nextStages);
          if (stageNumber && onStatusChange) {
            onStatusChange(nextStages.find((stage) => stage.numero === stageNumber)?.estado || null);
          }
        }
      })
      .catch(() => {
        if (mounted) {
          setStages([]);
          if (stageNumber && onStatusChange) onStatusChange(null);
        }
      });
    return () => { mounted = false; };
  }, [onStatusChange, stageNumber]);

  const activeStage = stages.find((stage) => stage.estado === "en_curso") || null;
  const targetStage = stageNumber ? stages.find((stage) => stage.numero === stageNumber) : null;

  if (targetStage?.estado === "completada") {
    const targetTitle = stageTitles[stageNumber] || targetStage.nombre;
    return (
      <Notice tone="completed">
        <span aria-hidden="true">❌</span>
        <span><strong>{targetTitle} ya finalizó.</strong></span>
        <span>El panel permanece disponible para consultar la información.</span>
      </Notice>
    );
  }

  if (!activeStage) {
    return <Notice tone="muted">No hay una etapa activa en este momento.</Notice>;
  }

  const activeTitle = stageTitles[activeStage.numero] || activeStage.nombre;
  if (!stageNumber) {
    return (
      <Notice tone="active">
        <span aria-hidden="true">✅</span>
        <span>Etapa activa: <strong>{activeTitle}</strong></span>
        <span className="text-emerald-800">{activeStage.fecha_fin ? `— Plazo: ${formatDate(activeStage.fecha_fin)}` : "— Sin fecha de cierre"}</span>
      </Notice>
    );
  }

  const targetTitle = stageTitles[stageNumber] || `Etapa ${stageNumber}`;
  const isTargetActive = activeStage.numero === stageNumber;

  return isTargetActive ? (
    <Notice tone="active">
      <span aria-hidden="true">✅</span>
      <span><strong>{targetTitle} activa.</strong></span>
      <span className="text-emerald-800">{activeStage.fecha_fin ? `— Plazo: ${formatDate(activeStage.fecha_fin)}` : "— Sin fecha de cierre"}</span>
    </Notice>
  ) : (
    <Notice tone="muted">
      <span aria-hidden="true">❗️</span>
      <span>{stageNumber < activeStage.numero ? `${targetTitle} ya finalizó.` : `${targetTitle} aún no está activa.`}</span>
      <span>La etapa actual es {activeTitle}.</span>
    </Notice>
  );
}

function formatDate(value) {
  return new Intl.DateTimeFormat("es-CU", { day: "numeric", month: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function Notice({ children, tone }) {
  const toneClass = tone === "active"
    ? "bg-emerald-100 text-emerald-800"
    : tone === "completed"
      ? "bg-sky-100 text-sky-800"
      : "bg-slate-100 text-slate-600";
  return <div className={`mt-6 flex flex-wrap items-center gap-2 rounded-2xl px-5 py-3 text-sm ${toneClass}`}>{children}</div>;
}
