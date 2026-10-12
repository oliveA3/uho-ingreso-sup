import { useEffect, useState } from "react";
import { createMunicipalUser, deleteMunicipalUser, fetchMunicipalSchools, fetchMunicipalUsers, updateMunicipalUser } from "../../api/municipal.service";
import EntityActionButton from "../../components/Buttons/EntityActionButton";
import StatusToggle from "../../components/Buttons/StatusToggle";
import PrimaryButton from "../../components/Buttons/PrimaryButton";
import SecondaryButton from "../../components/Buttons/SecondaryButton";
import AddButton from "../../components/Buttons/AddButton";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import { Card, DataTable, FormField, Input, Modal, Select, useConfirm } from "../../components";
import styles from "./UsuariosPage.module.css";

const emptyForm = { username: "", email: "", first_name: "", last_name: "", rol: "director_escuela", escuela: "", password: "" };
const nameOf = (user) => `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username;

export default function UsuariosPage() {
  const confirm = useConfirm();
  const [users, setUsers] = useState([]);
  const [schools, setSchools] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const [userData, schoolData] = await Promise.all([fetchMunicipalUsers(), fetchMunicipalSchools()]);
      setUsers(userData);
      setSchools(schoolData);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  function openCreate() { setEditing(null); setForm({ ...emptyForm }); setFormError(""); setModalOpen(true); }
  function openEdit(user) {
    setEditing(user);
    setForm({ username: user.username || "", email: user.email || "", first_name: user.first_name || "", last_name: user.last_name || "", rol: user.rol, escuela: String(user.escuela || ""), password: "" });
    setFormError("");
    setModalOpen(true);
  }
  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setFormError("");
      const payload = { ...form, escuela: Number(form.escuela) };
      if (!payload.password) delete payload.password;
      if (editing) await updateMunicipalUser(editing.id, payload); else await createMunicipalUser(payload);
      setModalOpen(false);
      setNotice(editing ? "El usuario se actualizó correctamente." : "El usuario se creó correctamente.");
      await loadData();
    } catch (requestError) { setFormError(requestError.message); }
  }
  async function toggleUser(user) {
    try { await updateMunicipalUser(user.id, { is_active: !user.is_active }); await loadData(); }
    catch (requestError) { setError(requestError.message); }
  }
  async function handleDelete(user) {
    const ok = await confirm({
      title: "Eliminar usuario",
      message: `¿Eliminar el usuario ${nameOf(user)}?`,
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    try { await deleteMunicipalUser(user.id); await loadData(); }
    catch (requestError) { setError(requestError.message); }
  }

  const filteredUsers = users.filter((user) => `${nameOf(user)} ${user.username} ${user.email} ${user.escuela_nombre}`.toLowerCase().includes(search.toLowerCase()));

  const columns = [
    { key: "nombre", header: "Nombre", className: styles.strongCell, render: nameOf },
    { key: "escuela", header: "Escuela", render: (user) => user.escuela_nombre || "-" },
    { key: "rol", header: "Rol", render: (user) => user.rol_label },
    { key: "correo", header: "Correo", render: (user) => user.email },
    { key: "estado", header: "Estado", render: (user) => <StatusToggle active={user.is_active} onClick={() => toggleUser(user)} /> },
    {
      key: "acciones",
      header: "Acciones",
      render: (user) => (
        <>
          <EntityActionButton variant="edit" onClick={() => openEdit(user)}>Editar</EntityActionButton>
          <EntityActionButton variant="delete" className={styles.deleteAction} onClick={() => handleDelete(user)}>Eliminar</EntityActionButton>
        </>
      ),
    },
  ];

  return (
    <div className={`municipal-users-page ${styles.page}`}>
      <Card padding="p-6">
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Usuarios</h1>
            <p className={styles.subtitle}>Crea Director y Secretario por escuela.</p>
          </div>
          <AddButton onClick={openCreate}>Nuevo usuario</AddButton>
        </div>
        {notice && <FeedbackMessage type="success" className={styles.feedbackMessage}>{notice}</FeedbackMessage>}
        {error && <FeedbackMessage type="error" className={styles.feedbackMessage}>{error}</FeedbackMessage>}
      </Card>
      <Card padding="p-6">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, correo o escuela" className={styles.searchInput} />
        <DataTable className={styles.table} columns={columns} data={filteredUsers} loading={loading} emptyMessage="No hay usuarios para mostrar." />
      </Card>
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar usuario" : "Nuevo usuario"}
        footer={
          <>
            <SecondaryButton onClick={() => setModalOpen(false)}>Cancelar</SecondaryButton>
            <PrimaryButton type="submit" form="repr-municipal-usuario-form">Guardar</PrimaryButton>
          </>
        }
      >
        <form id="repr-municipal-usuario-form" onSubmit={handleSubmit} className={styles.form}>
          {formError && <FeedbackMessage type="error" className={styles.formError}>{formError}</FeedbackMessage>}
          {[
            ["Nombre", "first_name", "given-name"],
            ["Apellidos", "last_name", "family-name"],
            ["Usuario", "username", "username"],
            ["Correo", "email", "email"],
          ].map(([label, field, autoComplete]) => (
            <FormField key={field} label={label}>
              <Input
                name={field}
                autoComplete={autoComplete}
                required
                value={form[field]}
                type={field === "email" ? "email" : "text"}
                onChange={(event) => setForm({ ...form, [field]: event.target.value })}
              />
            </FormField>
          ))}
          <FormField label="Rol">
            <Select required value={form.rol} onChange={(event) => setForm({ ...form, rol: event.target.value })}>
              <option value="director_escuela">Director de Escuela</option>
              <option value="secretario_escuela">Secretario de Escuela</option>
            </Select>
          </FormField>
          <FormField label="Escuela">
            <Select required value={form.escuela} onChange={(event) => setForm({ ...form, escuela: event.target.value })}>
              <option value="">Selecciona una escuela</option>
              {schools.map((school) => <option key={school.id} value={school.id}>{school.nombre}</option>)}
            </Select>
          </FormField>
          <FormField label={<>Contraseña{editing && <span className={styles.passwordHint}> (dejar vacía para conservarla)</span>}</>}>
            <Input name="password" autoComplete="new-password" required={!editing} minLength="8" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          </FormField>
        </form>
      </Modal>
    </div>
  );
}
