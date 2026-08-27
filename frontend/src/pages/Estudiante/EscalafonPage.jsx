import { useEffect, useState } from "react";
import { fetchEscalafon, submitEscalafonAction } from "../../services/api";

export default function EstudianteEscalafonPage() {
  const [entries, setEntries] = useState([]);
  const [current, setCurrent] = useState(null);
  const [error, setError] = useState("");
  const [cause, setCause] = useState("");

  useEffect(() => {
    fetchEscalafon().then((data) => {
      setEntries(data.entries);
      setCurrent(data.entries.find((entry) => entry.id === data.actual_id) || null);
    }).catch((requestError) => setError(requestError.message));
  }, []);

  async function act(action) {
    try {
      const result = await submitEscalafonAction(action, cause);
      setCurrent(result);
      setEntries((items) => items.map((entry) => entry.id === result.id ? result : entry));
      setCause("");
    } catch (requestError) { setError(requestError.message); }
  }

  const position = current ? entries.findIndex((entry) => entry.id === current.id) + 1 : null;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700">Mi Escalafón</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Consulta de posición en el escalafón</h1>
          <p className="mt-3 text-sm text-slate-600">Consulta tus índices académicos y tu posición en el proceso de ingreso.</p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-sm text-slate-600">Índice general</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{current?.indice_general || "--"}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-sm text-slate-600">Posición</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{position || "--"}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-sm text-slate-600">Estado</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{current?.aceptado === true ? "Aceptado" : current?.estado_revision === "pendiente" ? "Pendiente" : "Revisado"}</p>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="font-semibold text-slate-900">Detalle académico</h2>
          <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
            <p>10mo: {current?.indice_10 || "--"}</p>
            <p>11mo: {current?.indice_11 || "--"}</p>
            <p>12mo: {current?.indice_12 || "--"}</p>
          </div>
        </div>
        {error && <p className="mt-6 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
        {current && <div className="mt-6 space-y-4"><h2 className="font-semibold text-slate-900">Escalafón completo</h2><div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="min-w-full text-left text-sm"><thead className="bg-slate-100"><tr><th className="px-4 py-3">Posición</th><th className="px-4 py-3">Estudiante</th><th className="px-4 py-3">Índice general</th></tr></thead><tbody>{entries.map((entry, index) => <tr key={entry.id} className={entry.id === current.id ? "bg-sky-50 font-semibold" : "border-t border-slate-200"}><td className="px-4 py-3">{index + 1}</td><td className="px-4 py-3">{entry.nombre} {entry.apellidos}</td><td className="px-4 py-3">{entry.indice_general}</td></tr>)}</tbody></table></div><div className="rounded-2xl border border-slate-200 p-4"><p className="text-sm text-slate-600">¿Aceptas tus índices o deseas solicitar una revisión?</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => act("aceptar")} className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Aceptar</button><button type="button" onClick={() => act("revision")} className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white">Solicitar revisión</button></div><textarea value={cause} onChange={(event) => setCause(event.target.value)} placeholder="Causa de la revisión" className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-sm" /></div></div>}
      </section>
    </div>
  );
}
