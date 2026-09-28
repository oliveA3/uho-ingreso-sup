import { useEffect, useRef, useState } from "react";
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
import { Card, DataTable, Modal, StatCard, StatsGrid } from "../../components";
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
      className={`w-full min-w-0 rounded-lg border border-slate-300 px-2 py-1 text-sm ${className}`}
    />
  );
}

export default function SecretarioEscalafonPage() {
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [stageActive, setStageActive] = useState(false);
  const [permissions, setPermissions] = useState({ importar: false, editar: false, enviar: false });
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
  const showActions = permissions.editar;

  async function load() {
    try {
      setError("");
      const [data, summaryData] = await Promise.all([fetchEscalafon(), fetchProvincialEscalafonSummary()]);
      setEntries(data.entries || []);
      setStageActive(Boolean(data.stage_active));
      setPermissions({ importar: Boolean(data.puede_importar), editar: Boolean(data.puede_editar), enviar: Boolean(data.puede_enviar) });
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

  const change = (field) => (event) => changeDraft(field, event.target.value);
  const isEditing = (entry) => editingId === entry.id;
  const columns = [
    { key: "posicion", header: "#", render: (entry) => <span className="font-semibold text-slate-700">{entry.posicion}</span> },
    { key: "ci", header: "CI", render: (entry) => <span className="whitespace-nowrap font-medium text-slate-700">{entry.ci}</span> },
    {
      key: "estudiante",
      header: "Estudiante",
      render: (entry) => isEditing(entry) ? (
        <div className="flex min-w-40 flex-col gap-2">
          <TextInput value={draft.nombre} onChange={change("nombre")} ariaLabel={`Nombre de ${entry.ci}`} />
          <TextInput value={draft.apellidos} onChange={change("apellidos")} ariaLabel={`Apellidos de ${entry.ci}`} />
        </div>
      ) : `${entry.nombre} ${entry.apellidos}`,
    },
    {
      key: "sexo",
      header: "Sexo",
      render: (entry) => isEditing(entry) ? (
        <select value={draft.sexo} onChange={change("sexo")} aria-label={`Sexo de ${entry.ci}`} className="rounded-lg border border-slate-300 px-2 py-1 text-sm">
          <option value="M">M</option>
          <option value="F">F</option>
        </select>
      ) : entry.sexo,
    },
    {
      key: "direccion",
      header: "Dirección",
      render: (entry) => isEditing(entry)
        ? <TextInput value={draft.direccion} onChange={change("direccion")} className="min-w-40" ariaLabel={`Dirección de ${entry.ci}`} />
        : entry.direccion,
    },
    ...[["indice_10", "10mo"], ["indice_11", "11mo"], ["indice_12", "12mo"], ["indice_general", "Índice general"]].map(([field, header]) => ({
      key: field,
      header,
      render: (entry) => isEditing(entry)
        ? <TextInput value={draft[field]} onChange={change(field)} className="min-w-16" ariaLabel={`${header} de ${entry.ci}`} />
        : entry[field],
    })),
    {
      key: "estado",
      header: "Estado",
      render: (entry) => (
        <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(entry.estado)}`}>
          {statusLabel(entry.estado)}
        </span>
      ),
    },
    ...(showActions
      ? [{
          key: "acciones",
          header: "Acciones",
          render: (entry) => isEditing(entry) ? (
            <>
              <EntityActionButton variant="edit" onClick={saveEntry} disabled={saving}>{saving ? "Guardando" : "Guardar"}</EntityActionButton>
              <EntityActionButton variant="delete" onClick={() => setEditingId(null)} disabled={saving}>Cancelar</EntityActionButton>
            </>
          ) : (
            <>
              <EntityActionButton variant="edit" onClick={() => startEditing(entry)}>Editar</EntityActionButton>
              {entry.estado === "por_revisar" && <SecondaryButton className="ml-2 " onClick={() => setComplaintEntry(entry)}>Ver reclamación</SecondaryButton>}
            </>
          ),
        }]
      : []),
  ];

  return (
    <div className={styles.page}>
      <Card padding="p-6">
      <div className={styles.headerRow}>
        <div>
          <p className={styles.eyebrow}>Escalafón</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className={styles.title}>Escalafón de la escuela {summary?.year ? `(${summary.year})` : ""}</h1>
            {entries.length > 0 && (
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${entries[0].estado_escalafon === "enviado" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                {entries[0].estado_escalafon === "enviado" ? "Enviado" : "Pendiente"}
              </span>
            )}
          </div>
          <p className={styles.description}>Importa, revisa y actualiza los datos antes de enviarlos a la Comisión.</p>
        </div>
      </div>

      <StageStatusNotice stageNumber={1} />

      <StatsGrid className="my-5">
        <StatCard label="Aceptado" value={summary?.estudiantes_aceptaron ?? "-"} tone="success" />
        <StatCard label="Pendientes" value={summary?.estudiantes_pendientes ?? "-"} tone="warning" />
        <StatCard label="Total estudiantes" value={summary?.total_estudiantes ?? "-"} tone="neutral" />
      </StatsGrid>

      <div className="mb-4 flex flex-wrap gap-2">
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" disabled={!permissions.importar || importing} onChange={handleImport} />
        <PrimaryButton type="button" onClick={() => fileInputRef.current?.click()} disabled={!permissions.importar || importing}>{importing ? "Importando..." : "Importar Excel"}</PrimaryButton>
        <SecondaryButton onClick={exportExcel} disabled={!entries.length}>Exportar Excel</SecondaryButton>
        <PrimaryButton type="button" onClick={sendToCommission} disabled={!permissions.enviar || sending}>{sending ? "Enviando..." : "Enviar índices a la Comisión"}</PrimaryButton>
      </div>


      {error && <FeedbackMessage type="error" className="mb-4 rounded-xl">{error}</FeedbackMessage>}
      {notice && <FeedbackMessage type="success" className="mb-4 rounded-xl">{notice}</FeedbackMessage>}

      <DataTable
        className="table-scroll"
        columns={columns}
        data={entries}
        loading={loading}
        loadingMessage="Cargando escalafón..."
        emptyMessage="No hay estudiantes cargados."
      />

      <Modal
        open={Boolean(complaintEntry)}
        onClose={() => setComplaintEntry(null)}
        title="Reclamación del estudiante"
        description={complaintEntry ? `${complaintEntry.nombre} ${complaintEntry.apellidos} · CI ${complaintEntry.ci}` : ""}
        footer={
          <>
            <SecondaryButton onClick={() => setComplaintEntry(null)} disabled={reviewing}>Cerrar</SecondaryButton>
            <PrimaryButton onClick={markReviewAsReviewed} disabled={reviewing || !stageActive}>{reviewing ? "Guardando" : "Marcar como revisada"}</PrimaryButton>
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
      </Card>
    </div>
  );
}
