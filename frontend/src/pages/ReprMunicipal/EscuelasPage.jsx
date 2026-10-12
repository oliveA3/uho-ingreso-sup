import { useEffect, useState } from "react";
import {
  createMunicipalSchool,
  deleteMunicipalSchool,
  fetchMunicipalSchools,
  fetchMunicipalUsers,
  updateMunicipalSchool,
} from "../../api/municipal.service";
import EntityActionButton from "../../components/Buttons/EntityActionButton";
import StatusToggle from "../../components/Buttons/StatusToggle";
import PrimaryButton from "../../components/Buttons/PrimaryButton";
import SecondaryButton from "../../components/Buttons/SecondaryButton";
import AddButton from "../../components/Buttons/AddButton";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import { Card, DataTable, FormField, Input, Modal, StatCard, StatsGrid, useConfirm } from "../../components";
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
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

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

  function openCreate() { setEditing(null); setForm({ ...emptyForm }); setFormError(""); setModalOpen(true); }
  function openEdit(school) {
    setEditing(school);
    setForm({ nombre: school.nombre || "", codigo: school.codigo || "", descripcion: school.descripcion || "", activa: school.activa });
    setFormError("");
    setModalOpen(true);
  }
  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setFormError("");
      if (editing) await updateMunicipalSchool(editing.id, form); else await createMunicipalSchool(form);
      setModalOpen(false);
      setNotice(editing ? "La escuela se actualizó correctamente." : "La escuela se creó correctamente.");
      await loadData(false);
    } catch (requestError) { setFormError(requestError.message); }
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
    ["Escuelas", schools.length],
    ["Secretarios", secretaries],
    ["Directores", directors],
  ];

  const columns = [
    { key: "nombre", header: "Escuela", className: styles.strongCell, render: (s) => s.nombre },
    { key: "codigo", header: "Código", render: (s) => s.codigo || "-" },
    { key: "estado", header: "Estado", render: (s) => <StatusToggle active={s.activa} activeLabel="Activa" inactiveLabel="Inactiva" onClick={() => toggleSchool(s)} /> },
    {
      key: "acciones",
      header: "Acciones",
      render: (s) => (
        <>
          <EntityActionButton variant="edit" onClick={() => openEdit(s)}>Editar</EntityActionButton>
          <EntityActionButton variant="delete" className={styles.deleteAction} onClick={() => handleDelete(s)}>Eliminar</EntityActionButton>
        </>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <Card padding="p-6">
        <p className={styles.municipioLabel}>Municipio: {user?.municipio_nombre || "No asignado"}</p>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Escuelas</h1>
            <p className={styles.subtitle}>Crea y gestiona las escuelas de tu municipio.</p>
          </div>
          <AddButton onClick={openCreate}>Nueva escuela</AddButton>
        </div>
        {notice && <FeedbackMessage type="success" className={styles.feedbackMessage}>{notice}</FeedbackMessage>}
        {error && <FeedbackMessage type="error" className={styles.feedbackMessage}>{error}</FeedbackMessage>}
        <StatsGrid className={styles.statsGrid}>
          {stats.map(([label, value]) => (
            <StatCard key={label} label={label} value={value} />
          ))}
        </StatsGrid>
      </Card>
      <Card padding="p-6">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre o código" className={styles.searchInput} />
        <DataTable className={styles.table} columns={columns} data={filteredSchools} loading={loading} emptyMessage="No hay escuelas para mostrar." />
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
        <form id="repr-municipal-escuela-form" onSubmit={handleSubmit} className={styles.form}>
          {formError && <FeedbackMessage type="error" className={styles.formError}>{formError}</FeedbackMessage>}
          {[["Nombre", "nombre"], ["Código", "codigo"], ["Descripción", "descripcion"]].map(([label, field]) => (
            <FormField key={field} label={label}>
              <Input required={field === "nombre"} value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} />
            </FormField>
          ))}
          <label className={styles.activeCheckboxRow}>
            <input type="checkbox" checked={form.activa} onChange={(event) => setForm({ ...form, activa: event.target.checked })} /> Escuela activa
          </label>
        </form>
      </Modal>
    </div>
  );
}
