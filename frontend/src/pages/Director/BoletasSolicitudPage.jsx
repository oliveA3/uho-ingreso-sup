import { useEffect, useState } from "react";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import SolicitudOverviewView from "../../components/SolicitudOverviewView";
import { downloadSchoolSolicitudPdf, fetchSchoolSolicitudes } from "../../api/school.service";
import { Card } from "../../components";

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
  if (!data) return <Card padding="p-8" className="text-sm text-slate-600">Cargando boletas de solicitud...</Card>;
  return <SolicitudOverviewView data={data} title="Estado de las boletas de solicitud" canDownload onDownload={download} readOnly />;
}
