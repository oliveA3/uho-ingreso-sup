import { useEffect, useState } from "react";
import { downloadProvincialEscalafon, downloadSchoolEscalafon, fetchProvincialEscalafonSummary } from "../../services/api";
import FeedbackMessage from "../../components/FeedbackMessage";
import StageStatusNotice from "../../components/StageStatusNotice";

const statusStyles = {
  Completo: "bg-emerald-100 text-emerald-700",
  Parcial: "bg-amber-100 text-amber-700",
  Pendiente: "bg-rose-100 text-rose-700",
};

export default function EscalafonesPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [selectedMunicipio, setSelectedMunicipio] = useState(null);
  const [schoolExporting, setSchoolExporting] = useState(null);

  useEffect(() => {
    fetchProvincialEscalafonSummary()
      .then(setSummary)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  async function exportExcel() {
    try {
      setExporting(true);
      setError("");
      const blob = await downloadProvincialEscalafon();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "escalafones-provinciales.xlsx";
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setExporting(false);
    }
  }

  async function exportSchool(school) {
    try {
      setSchoolExporting(school.id);
      const blob = await downloadSchoolEscalafon(school.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `escalafon-${school.nombre}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSchoolExporting(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700">Escalafones recibidos</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Estado provincial</h1>
            <p className="mt-2 text-sm text-slate-600">Seguimiento de los escalafones enviados por cada municipio.</p>
          </div>
          <button type="button" onClick={exportExcel} disabled={exporting} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60">
            {exporting ? "Exportando..." : "Exportar Excel"}
          </button>
        </div>

        {error && <FeedbackMessage type="error" className="mt-5 rounded-2xl">{error}</FeedbackMessage>}

        <StageStatusNotice stageNumber={1} />

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><p className="text-sm text-slate-600">Escuelas enviaron</p><p className="mt-2 text-3xl font-semibold text-slate-900">{summary?.escuelas_enviaron ?? "-"}</p></div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><p className="text-sm text-slate-600">Escuelas pendientes</p><p className="mt-2 text-3xl font-semibold text-slate-900">{summary?.escuelas_pendientes ?? "-"}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><p className="text-sm text-slate-600">Total estudiantes</p><p className="mt-2 text-3xl font-semibold text-slate-900">{summary?.total_estudiantes ?? "-"}</p></div>
        </div>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-[#24577f] text-left text-white">
              <tr>{["Municipio", "Escuelas", "Enviaron", "Estudiantes", "Estado", "Detalle"].map((heading) => <th key={heading} className="whitespace-nowrap px-4 py-3">{heading}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading && <tr><td colSpan="6" className="px-4 py-10 text-center text-slate-500">Cargando estado provincial...</td></tr>}
              {!loading && !summary?.municipios?.length && <tr><td colSpan="6" className="px-4 py-10 text-center text-slate-500">No hay municipios disponibles.</td></tr>}
              {!loading && summary?.municipios?.map((municipio) => <tr key={municipio.id} className="hover:bg-slate-50"><td className="px-4 py-3 font-medium text-slate-800">{municipio.nombre}</td><td className="px-4 py-3">{municipio.escuelas}</td><td className="px-4 py-3">{municipio.escuelas_enviaron}/{municipio.escuelas}</td><td className="px-4 py-3">{municipio.estudiantes}</td><td className="px-4 py-3"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[municipio.estado]}`}>{municipio.estado}</span></td><td className="px-4 py-3"><button type="button" onClick={() => setSelectedMunicipio(municipio)} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">Ver escuelas</button></td></tr>)}
            </tbody>
          </table>
        </div>
      </section>
      {selectedMunicipio && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold text-slate-900">Escuelas de {selectedMunicipio.nombre}</h2><p className="mt-1 text-sm text-slate-600">Descarga el escalafón de una escuela específica.</p></div><button type="button" onClick={() => setSelectedMunicipio(null)} className="text-xl text-slate-500" aria-label="Cerrar">&times;</button></div><div className="mt-5 space-y-2">{selectedMunicipio.escuelas_lista.map((school) => <div key={school.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"><div><p className="font-medium text-slate-800">{school.nombre}</p><p className="text-xs text-slate-500">{school.estado === "enviado" ? "Enviado" : "Pendiente"}</p></div><button type="button" onClick={() => exportSchool(school)} disabled={schoolExporting === school.id || school.estado !== "enviado"} className="rounded-xl bg-sky-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{schoolExporting === school.id ? "Descargando..." : "Descargar Excel"}</button></div>)}</div><div className="mt-5 flex justify-end"><button type="button" onClick={() => setSelectedMunicipio(null)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cerrar</button></div></div></div>}
    </div>
  );
}