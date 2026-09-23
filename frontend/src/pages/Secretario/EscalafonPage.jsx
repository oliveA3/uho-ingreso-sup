import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchEscalafon,
  fetchProvincialEscalafonSummary,
  getEscalafonExportUrl,
  importEscalafon,
  markEscalafonReviewAsReviewed,
  sendEscalafonToCommission,
  updateEscalafonEntry,
} from "../../api/escalafon.service";
import EntityActionButton from "../../components/Buttons/EntityActionButton";
import PrimaryButton from "../../components/Buttons/PrimaryButton";
import SecondaryButton from "../../components/Buttons/SecondaryButton";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import StageStatusNotice from "../../components/StageStatusNotice/StageStatusNotice";
import { Modal, StatCard, StatsGrid } from "../../components";
import { useConfirm } from "../../components/ConfirmDialog/ConfirmDialogProvider";
import styles from "./EscalafonPage.module.css";

const indexFields = ["indice_10", "indice_11", "indice_12", "indice_general"];

function statusLabel(status) {
  if (status === "aceptado") return "Aceptado";
  if (status === "por_revisar") return "Por revisar";
  return "Sin respuesta";
}

function statusClass(status) {
  if (status === "aceptado") return "bg-emerald-100 text-emerald-700";
  if (status === "por_revisar") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function TextInput({ value, onChange, className = "", ariaLabel }) {
  return (
    <input
      value={value ?? ""}
      onChange={onChange}
      aria-label={ariaLabel}
      className={`rounded-lg border border-slate-300 px-2 py-1 text-sm ${className}`}
    />
  );
}

function StudentRow({ entry, position, isEditing, draft, stageActive, saving, showActions, onEdit, onComplaint, onChange, onSave, onCancel }) {
  const change = (field) => (event) => onChange(field, event.target.value);
  return (
    <tr className="border-t border-slate-200 align-middle hover:bg-slate-50">
      <td className="w-10 px-1 py-2 text-center font-semibold text-slate-700">{position}</td>
      <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-700">{entry.ci}</td>
      <td className="w-[300px] whitespace-nowrap px-3 py-2">
        {isEditing ? (
          <div className="flex min-w-64 gap-2">
            <TextInput value={draft.nombre} onChange={change("nombre")} className="w-28" ariaLabel={`Nombre de ${entry.ci}`} />
            <TextInput value={draft.apellidos} onChange={change("apellidos")} className="w-36" ariaLabel={`Apellidos de ${entry.ci}`} />
          </div>
        ) : (
          <span className="whitespace-nowrap text-slate-800">{entry.nombre} {entry.apellidos}</span>
        )}
      </td>
      <td className="px-3 py-2">
        {isEditing ? (
          <select value={draft.sexo} onChange={change("sexo")} aria-label={`Sexo de ${entry.ci}`} className="rounded-lg border border-slate-300 px-2 py-1 text-sm">
            <option value="M">M</option>
            <option value="F">F</option>
          </select>
        ) : entry.sexo}
      </td>
      <td className="px-3 py-2">
          {isEditing ? <TextInput value={draft.direccion} onChange={change("direccion")} className="w-36" ariaLabel={`Dirección de ${entry.ci}`} /> : entry.direccion}
      </td>
      {indexFields.map((field) => (
        <td key={field} className="w-20 px-2 py-2 text-right">
          {isEditing ? (
            <TextInput value={draft[field]} onChange={change(field)} className="w-14 text-right" ariaLabel={`${field.replace("_", " ")} de ${entry.ci}`} />
          ) : entry[field]}
        </td>
      ))}
      <td className="px-3 py-2">
        <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(entry.estado)}`}>
          {statusLabel(entry.estado)}
        </span>
      </td>
      {showActions && <td className="w-[185px] whitespace-nowrap px-1 py-2 text-left">
        {isEditing ? (
          <div className="flex justify-start gap-2">
            <EntityActionButton variant="edit" className="px-2 py-1" onClick={onSave} disabled={saving}>{saving ? "Guardando" : "Guardar"}</EntityActionButton>
            <EntityActionButton variant="delete" className="px-4 py-1" onClick={onCancel} disabled={saving}>Cancelar</EntityActionButton>
          </div>
        ) : (
          <div className="flex justify-start gap-2">
            <EntityActionButton variant="edit" className="px-2 py-1" onClick={onEdit}>Editar</EntityActionButton>
            {entry.estado === "por_revisar" && <SecondaryButton className="px-2 py-1 text-xs" onClick={onComplaint}>Ver reclamación</SecondaryButton>}
          </div>
        )}
      </td>}
    </tr>
  );
}

export default function SecretarioEscalafonPage() {
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [stageActive, setStageActive] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [complaintEntry, setComplaintEntry] = useState(null);
  const [reviewing, setReviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef(null);
  const confirm = useConfirm();
  const escalafonSent = entries[0]?.estado_escalafon === "enviado";
  const showActions = stageActive && !escalafonSent;
  const handleStageStatus = useCallback((status) => {
    setStageActive(status === "en_curso");
  }, []);

  async function load() {
    try {
      setError("");
      const [data, summaryData] = await Promise.all([fetchEscalafon(), fetchProvincialEscalafonSummary()]);
      setEntries(data.entries || []);
      setStageActive(Boolean(data.stage_active));
      setSummary(summaryData);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function startEditing(entry) {
    const fields = ["nombre", "apellidos", "sexo", "direccion", ...indexFields];
    setEditingId(entry.id);
    setDraft(Object.fromEntries(fields.map((field) => [field, entry[field] ?? ""])));
    setError("");
    setNotice("");
  }

  function changeDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function saveEntry() {
    try {
      setSaving(true);
      await updateEscalafonEntry(editingId, draft);
      setEditingId(null);
      setNotice("Registro actualizado.");
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const shouldImport = await confirm({
      title: "Importar escalafón",
      message: `Se reemplazará el escalafón actual con los datos de "${file.name}". Esta acción no se puede deshacer. ¿Deseas continuar?`,
      confirmLabel: "Importar",
      tone: "danger",
    });
    if (!shouldImport) {
      event.target.value = "";
      return;
    }
    setError("");
    setImporting(true);
    try {
      const result = await importEscalafon(file, "", new Date().getFullYear());
      setNotice(`${result.inserted} estudiantes importados.`);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  }

  function exportExcel() {
    window.location.assign(getEscalafonExportUrl("", new Date().getFullYear()));
  }

  async function sendToCommission() {
    const shouldSend = await confirm({
      title: "Enviar índices a la Comisión",
      message: "Una vez enviados, los índices quedarán bloqueados de forma definitiva y no podrás editarlos. ¿Deseas continuar?",
      confirmLabel: "Enviar definitivamente",
      tone: "danger",
    });
    if (!shouldSend) return;
    setError("");
    setSending(true);
    try {
      await sendEscalafonToCommission();
      setNotice("Índices enviados y bloqueados definitivamente.");
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSending(false);
    }
  }

  async function markReviewAsReviewed() {
    try {
      setReviewing(true);
      await markEscalafonReviewAsReviewed(complaintEntry.id);
      setComplaintEntry(null);
      setNotice("Reclamación marcada como revisada.");
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setReviewing(false);
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <header className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">Escalafón de la escuela {summary?.year ? `(${summary.year})` : ""}</h1>
          {entries.length > 0 && (
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${entries[0].estado_escalafon === "enviado" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {entries[0].estado_escalafon === "enviado" ? "Enviado" : "Pendiente"}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-slate-600">Importa, revisa y actualiza los datos antes de enviarlos a la Comisión.</p>
      </header>
      
      <StageStatusNotice stageNumber={1} onStatusChange={handleStageStatus} />

      <StatsGrid className="my-5">
        <StatCard label="Aceptado" value={summary?.estudiantes_aceptaron ?? "-"} tone="success" />
        <StatCard label="Pendientes" value={summary?.estudiantes_pendientes ?? "-"} tone="warning" />
        <StatCard label="Total estudiantes" value={summary?.total_estudiantes ?? "-"} tone="neutral" />
      </StatsGrid>

      <div className="mb-4 flex flex-wrap gap-2">
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" disabled={!stageActive || importing} onChange={handleImport} />
        <PrimaryButton type="button" onClick={() => fileInputRef.current?.click()} disabled={!stageActive || importing}>{importing ? "Importando..." : "Importar Excel"}</PrimaryButton>
        <SecondaryButton onClick={exportExcel} disabled={!entries.length}>Exportar Excel</SecondaryButton>
        <PrimaryButton type="button" onClick={sendToCommission} disabled={!entries.length || !stageActive || escalafonSent || sending}>{sending ? "Enviando..." : "Enviar índices a la Comisión"}</PrimaryButton>
      </div>


      {error && <FeedbackMessage type="error" className="mb-4 rounded-xl">{error}</FeedbackMessage>}
      {notice && <FeedbackMessage type="success" className="mb-4 rounded-xl">{notice}</FeedbackMessage>}

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full min-w-[1050px] table-fixed border-collapse text-sm">
          <colgroup>
            <col className="w-10" />
            <col className="w-[110px]" />
            <col className="w-[195px]" />
            <col className="w-[70px]" />
            <col className="w-[170px]" />
            <col className="w-[60px]" />
            <col className="w-[60px]" />
            <col className="w-[60px]" />
            <col className="w-[100px]" />
            <col className="w-[110px]" />
            {showActions && <col className="w-[170px]" />}
          </colgroup>
          <thead className={`${styles.tableHead} text-left text-white`}>
            <tr>
              {["#", "CI", "Estudiante", "Sexo", "Dirección", "10mo", "11mo", "12mo", "Índice general", "Estado"].map((heading) => <th key={heading} className={`whitespace-nowrap px-2 py-2 ${heading === "#" || heading === "Estado" ? "text-center" : ""}`}>{heading}</th>)}
              {showActions && <th className="w-[185px] whitespace-nowrap px-1 py-2">Acción</th>}
            </tr>
          </thead>
          <tbody className="bg-white">
            {loading && <tr><td colSpan={showActions ? 11 : 10} className="px-4 py-8 text-center text-slate-500">Cargando escalafón...</td></tr>}
            {!loading && !entries.length && <tr><td colSpan={showActions ? 11 : 10} className="px-2 py-8 text-center text-slate-500">No hay estudiantes cargados.</td></tr>}
            {!loading && entries.map((entry) => (
              <StudentRow
                key={entry.id}
                entry={entry}
                position={entry.posicion}
                isEditing={editingId === entry.id}
                draft={draft}
                stageActive={stageActive}
                saving={saving}
                showActions={showActions}
                onEdit={() => startEditing(entry)}
                onComplaint={() => setComplaintEntry(entry)}
                onChange={changeDraft}
                onSave={saveEntry}
                onCancel={() => setEditingId(null)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={Boolean(complaintEntry)}
        onClose={() => setComplaintEntry(null)}
        title="Reclamación del estudiante"
        description={complaintEntry ? `${complaintEntry.nombre} ${complaintEntry.apellidos} · CI ${complaintEntry.ci}` : ""}
        footer={
          <>
            <SecondaryButton onClick={() => setComplaintEntry(null)} disabled={reviewing}>Cerrar</SecondaryButton>
            <PrimaryButton onClick={markReviewAsReviewed} disabled={reviewing}>{reviewing ? "Guardando" : "Marcar como revisada"}</PrimaryButton>
          </>
        }
      >
        {complaintEntry && (
          <FeedbackMessage type="warning" className="rounded-xl">
            <p>{complaintEntry.causa_revision || "El estudiante no indicó una causa."}</p>
            {complaintEntry.fecha_revision && <p className="mt-1 text-xs opacity-75">Solicitada el {new Date(complaintEntry.fecha_revision).toLocaleString("es-CU")}</p>}
          </FeedbackMessage>
        )}
      </Modal>
    </section>
  );
}
