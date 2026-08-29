import { useEffect, useState } from "react";
import { downloadStudentSolicitudPdf, fetchStudentSolicitud, submitStudentSolicitud } from "../../services/api";

export default function BoletaPage() {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchStudentSolicitud().then((result) => { setData(result); setSelected((result.items || []).map((item) => item.plan_plaza)); }).catch((error) => setMessage(error.message));
  }, []);

  const toggleCareer = (id) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 10 ? [...current, id] : current);
  const send = async () => {
    try {
      const preview = await submitStudentSolicitud(selected);
      if (preview.confirmacion_requerida && window.confirm("Confirma el orden de prioridades de tu boleta antes de enviarla.")) {
        setData(await submitStudentSolicitud(selected, true));
        setMessage("Boleta enviada y pendiente de aprobación del Secretario.");
      }
    } catch (error) { setMessage(error.message); }
  };
  const download = async () => {
    try {
      const blob = await downloadStudentSolicitudPdf();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "boleta-solicitud.pdf";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) { setMessage(error.message); }
  };
  const student = data?.student;
  const available = data?.available_plans || [];
  const locked = data?.estado === "aprobada";

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">📝 Boleta de Solicitud</h1>
            <p className="mt-2 text-sm text-slate-600">Revisa y descarga tu boleta oficial de solicitud de ingreso.</p>
          </div>
          <button type="button" onClick={download} disabled={!data?.id} className="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50">
            Descargar boleta PDF
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {[
            { label: "Nombre", value: student ? `${student.nombre} ${student.apellidos}` : "Cargando..." },
            { label: "CI", value: student?.ci || "-" },
            { label: "Escuela", value: student?.escuela || "-" },
            { label: "Índice general", value: student?.indice_general ?? "-" },
          ].map((item) => (
            <div key={item.label} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700">
          <div className="space-y-2">
            {available.map((plan) => (
              <label key={plan.id} className="flex items-center gap-3 rounded-2xl bg-white p-3">
                <input type="checkbox" checked={selected.includes(plan.id)} onChange={() => toggleCareer(plan.id)} disabled={locked} />
                <span>{plan.carrera_nombre} ({plan.ces_nombre})</span>
              </label>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-500">Prioridades seleccionadas: {selected.length}/10</p>
          {data?.estado && <p className="mt-2 text-xs text-slate-500">Estado: {data.estado}</p>}
          {message && <p className="mt-3 text-sm text-sky-700">{message}</p>}
          <button type="button" onClick={send} disabled={selected.length === 0 || locked} className="mt-4 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Enviar boleta</button>
        </div>
      </section>
    </div>
  );
}
