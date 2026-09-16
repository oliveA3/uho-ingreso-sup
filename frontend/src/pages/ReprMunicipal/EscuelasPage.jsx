import { useEffect, useState } from "react";
import {
  createMunicipalSchool,
  deleteMunicipalSchool,
  fetchMunicipalSchools,
  fetchMunicipalUsers,
  updateMunicipalSchool,
} from "../../services/api";
import EntityActionButton from "../../components/Buttons/EntityActionButton";
import StatusToggle from "../../components/Buttons/StatusToggle";
import PrimaryButton from "../../components/Buttons/PrimaryButton";
import SecondaryButton from "../../components/Buttons/SecondaryButton";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import { Card, DataTable, FormField, Input, Modal, useConfirm } from "../../components";
import styles from "./EscuelasPage.module.css";

const emptyForm = { nombre: "", codigo: "", descripcion: "", activa: true };

export default function EscuelasPage({ user }) {
  const confirm = useConfirm();
  const [schools, setSchools] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData(showLoading = true) {
    try {
      if (showLoading) setLoading(true);
      setError("");
      const [schoolData, userData] = await Promise.all([fetchMunicipalSchools(), fetchMunicipalUsers()]);
      setSchools(schoolData);
      setUsers(userData);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  function openCreate() { setEditing(null); setForm({ ...emptyForm }); setModalOpen(true); }
  function openEdit(school) {
    setEditing(school);
    setForm({ nombre: school.nombre || "", codigo: school.codigo || "", descripcion: school.descripcion || "", activa: school.activa });
    setModalOpen(true);
  }
  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setError("");
      if (editing) await updateMunicipalSchool(editing.id, form); else await createMunicipalSchool(form);
      setModalOpen(false);
      await loadData(false);
    } catch (requestError) { setError(requestError.message); }
  }
  async function toggleSchool(school) {
    try { await updateMunicipalSchool(school.id, { activa: !school.activa }); await loadData(false); }
    catch (requestError) { setError(requestError.message); }
  }
  async function handleDelete(school) {
    const ok = await confirm({
      title: "Eliminar escuela",
      message: `¿Eliminar la escuela ${school.nombre}?`,
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    try { await deleteMunicipalSchool(school.id); await loadData(false); }
    catch (requestError) { setError(requestError.message); }
  }

  const normalizedSearch = search.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const filteredSchools = schools.filter((school) => `${school.nombre} ${school.codigo || ""}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes(normalizedSearch));
  const activeUsers = users.filter((u) => u.is_active);
  const directors = activeUsers.filter((u) => u.rol === "director_escuela").length;
  const secretaries = activeUsers.filter((u) => u.rol === "secretario_escuela").length;

  const stats = [
    ["Escuelas", schools.length, "Registros totales"],
    ["Secretarios", secretaries, "Activos"],
    ["Directores", directors, "Activos"],
  ];

  const columns = [
    { key: "nombre", header: "Escuela", className: "font-medium text-slate-900", render: (s) => s.nombre },
    { key: "codigo", header: "Código", render: (s) => s.codigo || "-" },
    { key: "estado", header: "Estado", render: (s) => <StatusToggle active={s.activa} activeLabel="Activa" inactiveLabel="Inactiva" onClick={() => toggleSchool(s)} /> },
    {
      key: "acciones",
      header: "Acciones",
      render: (s) => (
        <>
          <EntityActionButton variant="edit" onClick={() => openEdit(s)}>Editar</EntityActionButton>
          <EntityActionButton variant="delete" className="ml-2" onClick={() => handleDelete(s)}>Eliminar</EntityActionButton>
        </>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card padding="p-8">
        <p className="mb-4 text-sm font-semibold text-slate-600">Municipio: {user?.municipio_nombre || "No asignado"}</p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700">Gestión municipal</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Escuelas</h1>
            <p className="mt-2 text-sm text-slate-600">Crea y gestiona las escuelas de tu municipio.</p>
          </div>
          <PrimaryButton onClick={openCreate}>+ Nueva escuela</PrimaryButton>
        </div>
        {error && <FeedbackMessage type="error" className="mt-5 rounded-2xl">{error}</FeedbackMessage>}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {stats.map(([label, value, caption]) => (
            <div key={label} className={styles.statCard}>
              <p className="text-sm uppercase tracking-[0.18em] text-slate-500">{label}</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
              <p className="mt-1 text-sm text-slate-500">{caption}</p>
            </div>
          ))}
        </div>
      </Card>
      <Card padding="p-8">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre o código" className="!mt-0 max-w-md" />
        <DataTable className="mt-6" columns={columns} data={filteredSchools} loading={loading} emptyMessage="No hay escuelas para mostrar." />
      </Card>
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar escuela" : "Nueva escuela"}
        footer={
          <>
            <SecondaryButton onClick={() => setModalOpen(false)}>Cancelar</SecondaryButton>
            <PrimaryButton type="submit" form="repr-municipal-escuela-form">Guardar</PrimaryButton>
          </>
        }
      >
        <form id="repr-municipal-escuela-form" onSubmit={handleSubmit} className="space-y-4">
          {[["Nombre", "nombre"], ["Código", "codigo"], ["Descripción", "descripcion"]].map(([label, field]) => (
            <FormField key={field} label={label}>
              <Input required={field === "nombre"} value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} />
            </FormField>
          ))}
          <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
            <input type="checkbox" checked={form.activa} onChange={(event) => setForm({ ...form, activa: event.target.checked })} /> Escuela activa
          </label>
        </form>
      </Modal>
    </div>
  );
}
