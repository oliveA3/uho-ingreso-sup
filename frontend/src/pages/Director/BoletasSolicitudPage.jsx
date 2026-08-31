import { useEffect, useState } from "react";
import FeedbackMessage from "../../components/FeedbackMessage";
import SolicitudOverviewView from "../../features/escuela/components/SolicitudOverviewView";
import { downloadSchoolSolicitudPdf, fetchSchoolSolicitudes } from "../../services/api";

export default function DirectorBoletasSolicitudPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSchoolSolicitudes().then(setData).catch((requestError) => setError(requestError.message));
  }, []);

  const download = async (id) => {
    const blob = await downloadSchoolSolicitudPdf(id);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "boleta-solicitud.pdf";
    link.click();
    URL.revokeObjectURL(url);
  };

  if (error) return <FeedbackMessage type="error" className="rounded-2xl">{error}</FeedbackMessage>;
  if (!data) return <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">Cargando boletas de solicitud...</div>;
  return <SolicitudOverviewView data={data} title="Estado de las boletas de solicitud" canDownload onDownload={download} readOnly />;
}
