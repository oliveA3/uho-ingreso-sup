import { useEffect, useRef, useState } from "react";
import { downloadEscalafonTemplate, fetchEscalafon, importEscalafon, reviewEscalafonEntry, sendEscalafonToCommission, updateEscalafonEntry } from "../../services/api";
import PrimaryButton from "../../components/Buttons/PrimaryButton";
import SecondaryButton from "../../components/Buttons/SecondaryButton";
import EntityActionButton from "../../components/Buttons/EntityActionButton";

export default function SecretarioEscalafonPage() {
  const [entries, setEntries] = useState([]);
  const [stageActive, setStageActive] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);

  const load = () => fetchEscalafon().then((data) => { setEntries(data.entries); setStageActive(true); }).catch((requestError) => setError(requestError.message)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  async function handleImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try { setError(""); const result = await importEscalafon(file, "", new Date().getFullYear()); setNotice(`${result.inserted} estudiantes importados.`); await load(); } catch (requestError) { setError(requestError.message); }
    event.target.value = "";
  }
  async function saveEntry(entry) {
    try { await updateEscalafonEntry(entry.id, entry); setNotice("Registro actualizado."); await load(); } catch (requestError) { setError(requestError.message); }
  }
  async function sendToCommission() {
    try { await sendEscalafonToCommission(); setNotice("Índices enviados y bloqueados definitivamente."); await load(); } catch (requestError) { setError(requestError.message); }
  }
  async function downloadTemplate() {
    try {
      const blob = await downloadEscalafonTemplate();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "plantilla-escalafon.xlsx";
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) { setError(requestError.message); }
  }
  async function markReviewed(id) {
    try { await reviewEscalafonEntry(id); setNotice("Solicitud marcada como revisada."); await load(); } catch (requestError) { setError(requestError.message); }
  }
  function updateEntry(id, field, value) { setEntries((current) => current.map((entry) => entry.id === id ? { ...entry, [field]: value } : entry)); }

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Escalafón</h1>
          <p className="mt-2 text-sm text-slate-600">
            Importa el escalafón desde Excel y gestiona el estado de los estudiantes.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" disabled={!stageActive} onChange={handleImport} />
        <PrimaryButton type="button" onClick={() => fileInputRef.current?.click()} disabled={!stageActive}>Importar Excel</PrimaryButton>
        <SecondaryButton onClick={downloadTemplate}>Descargar plantilla</SecondaryButton>
        <PrimaryButton type="button" onClick={sendToCommission}>Enviar índices a la Comisión</PrimaryButton>
      </div>
      {error && <p className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
      {notice && <p className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</p>}

      <div className="mt-6 space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm text-slate-600">Lista de estudiantes con filtros y gestión del escalafón.</p>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-100 text-slate-500">
              <tr>
                <th className="px-4 py-3">CI</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Apellidos</th>
                <th className="px-4 py-3">Sexo</th>
                <th className="px-4 py-3">Dirección</th>
                <th className="px-4 py-3">10mo</th>
                <th className="px-4 py-3">11mo</th>
                <th className="px-4 py-3">12mo</th>
                <th className="px-4 py-3">Índice</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? <tr><td colSpan="11" className="px-4 py-8 text-center">Cargando escalafón...</td></tr> : entries.map((entry) => <tr key={entry.id}><td className="px-4 py-4">{entry.ci}</td><td className="px-4 py-4"><input value={entry.nombre} onChange={(event) => updateEntry(entry.id, "nombre", event.target.value)} className="w-32 rounded-lg border px-2 py-1" /></td><td className="px-4 py-4"><input value={entry.apellidos} onChange={(event) => updateEntry(entry.id, "apellidos", event.target.value)} className="w-36 rounded-lg border px-2 py-1" /></td><td className="px-4 py-4"><select value={entry.sexo} onChange={(event) => updateEntry(entry.id, "sexo", event.target.value)} className="rounded-lg border px-2 py-1"><option value="M">M</option><option value="F">F</option></select></td><td className="px-4 py-4"><input value={entry.direccion} onChange={(event) => updateEntry(entry.id, "direccion", event.target.value)} className="w-40 rounded-lg border px-2 py-1" /></td><td className="px-4 py-4"><input value={entry.indice_10} disabled={entry.indices_bloqueados || !stageActive} onChange={(event) => updateEntry(entry.id, "indice_10", event.target.value)} className="w-20 rounded-lg border px-2 py-1" /></td><td className="px-4 py-4"><input value={entry.indice_11} disabled={entry.indices_bloqueados || !stageActive} onChange={(event) => updateEntry(entry.id, "indice_11", event.target.value)} className="w-20 rounded-lg border px-2 py-1" /></td><td className="px-4 py-4"><input value={entry.indice_12} disabled={entry.indices_bloqueados || !stageActive} onChange={(event) => updateEntry(entry.id, "indice_12", event.target.value)} className="w-20 rounded-lg border px-2 py-1" /></td><td className="px-4 py-4"><input value={entry.indice_general} disabled={entry.indices_bloqueados || !stageActive} onChange={(event) => updateEntry(entry.id, "indice_general", event.target.value)} className="w-20 rounded-lg border px-2 py-1" /></td><td className="px-4 py-4">{entry.estado_revision}</td><td className="px-4 py-4"><EntityActionButton variant="edit" onClick={() => saveEntry(entry)}>Guardar</EntityActionButton>{entry.estado_revision === "pendiente" && <EntityActionButton variant="delete" className="ml-2" onClick={() => markReviewed(entry.id)}>Revisada</EntityActionButton>}</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
