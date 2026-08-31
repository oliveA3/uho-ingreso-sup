import { useEffect, useState } from "react";
import FeedbackMessage from "../../components/FeedbackMessage";
import SolicitudOverviewView from "../../features/escuela/components/SolicitudOverviewView";
import { approveSchoolSolicitud, downloadSchoolSolicitudPdf, fetchSchoolSolicitudes } from "../../services/api";

export default function SecretarioBoletasSolicitudPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSchoolSolicitudes().then(setData).catch((requestError) => setError(requestError.message));
  }, []);

  const approve = async (id) => {
    await approveSchoolSolicitud(id);
    setData((current) => ({ ...current, items: current.items.map((item) => item.id === id ? { ...item, estado: "aprobada" } : item), metrics: { ...current.metrics, pendientes: Math.max((current.metrics?.pendientes || 0) - 1, 0), aprobadas: (current.metrics?.aprobadas || 0) + 1 } }));
  };

  const download = async (id) => {
    try {
      const blob = await downloadSchoolSolicitudPdf(id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "boleta-solicitud.pdf";
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) { setError(requestError.message); }
  };

  if (error) return <FeedbackMessage type="error" className="rounded-2xl">{error}</FeedbackMessage>;
  if (!data) return <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">Cargando boletas de solicitud...</div>;
  return <SolicitudOverviewView data={data} title="Gestión de boletas de solicitud" canManage canApprove={Boolean(data.stage_active)} canDownload onApprove={approve} onDownload={download} />;
}
