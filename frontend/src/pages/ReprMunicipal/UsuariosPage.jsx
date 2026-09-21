import { useEffect, useState } from "react";
import { createMunicipalUser, deleteMunicipalUser, fetchMunicipalSchools, fetchMunicipalUsers, updateMunicipalUser } from "../../api/municipal.service";
import EntityActionButton from "../../components/Buttons/EntityActionButton";
import StatusToggle from "../../components/Buttons/StatusToggle";
import PrimaryButton from "../../components/Buttons/PrimaryButton";
import SecondaryButton from "../../components/Buttons/SecondaryButton";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import { Card, DataTable, FormField, Input, Modal, Select, useConfirm } from "../../components";

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

  function openCreate() { setEditing(null); setForm({ ...emptyForm }); setModalOpen(true); }
  function openEdit(user) {
    setEditing(user);
    setForm({ username: user.username || "", email: user.email || "", first_name: user.first_name || "", last_name: user.last_name || "", rol: user.rol, escuela: String(user.escuela || ""), password: "" });
    setModalOpen(true);
  }
  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setError("");
      const payload = { ...form, escuela: Number(form.escuela) };
      if (!payload.password) delete payload.password;
      if (editing) await updateMunicipalUser(editing.id, payload); else await createMunicipalUser(payload);
      setModalOpen(false);
      await loadData();
    } catch (requestError) { setError(requestError.message); }
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
    { key: "nombre", header: "Nombre", className: "font-medium text-slate-900", render: nameOf },
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
          <EntityActionButton variant="delete" className="ml-2" onClick={() => handleDelete(user)}>Eliminar</EntityActionButton>
        </>
      ),
    },
  ];

  return (
    <div className="municipal-users-page space-y-6">
      <Card padding="p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700">Gestión</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Usuarios</h1>
            <p className="mt-2 text-sm text-slate-600">Crea Director y Secretario por escuela.</p>
          </div>
          <PrimaryButton onClick={openCreate}>+ Nuevo usuario</PrimaryButton>
        </div>
        {error && <FeedbackMessage type="error" className="mt-5 rounded-2xl">{error}</FeedbackMessage>}
      </Card>
      <Card padding="p-8">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, correo o escuela" className="!mt-0 max-w-md" />
        <DataTable className="mt-6" columns={columns} data={filteredUsers} loading={loading} emptyMessage="No hay usuarios para mostrar." />
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
        <form id="repr-municipal-usuario-form" onSubmit={handleSubmit} className="space-y-4">
          {[["Nombre", "first_name"], ["Apellidos", "last_name"], ["Usuario", "username"], ["Correo", "email"]].map(([label, field]) => (
            <FormField key={field} label={label}>
              <Input required value={form[field]} type={field === "email" ? "email" : "text"} onChange={(event) => setForm({ ...form, [field]: event.target.value })} />
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
          <FormField label={<>Contraseña{editing && <span className="font-normal text-slate-500"> (dejar vacía para conservarla)</span>}</>}>
            <Input required={!editing} minLength="8" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          </FormField>
        </form>
      </Modal>
    </div>
  );
}
