import { useEffect, useState } from "react";
import {
  createProvincialUser,
  deleteProvincialUser,
  fetchProvincialMunicipalities,
  fetchProvincialUsers,
  updateProvincialUser,
} from "../../api/provincial.service";
import { normalizeCatalogList } from "../../api/httpClient";
import EntityActionButton from "../../components/Buttons/EntityActionButton";
import StatusToggle from "../../components/Buttons/StatusToggle";
import PrimaryButton from "../../components/Buttons/PrimaryButton";
import SecondaryButton from "../../components/Buttons/SecondaryButton";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import { Card, DataTable, FormField, Input, Modal, Select, useConfirm } from "../../components";
import styles from "./UsuariosPage.module.css";

const emptyForm = {
  username: "",
  email: "",
  first_name: "",
  last_name: "",
  municipio: "",
  password: "",
};

function displayName(user) {
  return `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username;
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export default function UsuariosPage() {
  const confirm = useConfirm();
  const [users, setUsers] = useState([]);
  const [municipios, setMunicipios] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadUsers() {
    try {
      setLoading(true);
      setError("");
      setUsers(await fetchProvincialUsers());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
    fetchProvincialMunicipalities()
      .then((data) => setMunicipios(normalizeCatalogList(data)))
      .catch((requestError) => setError(requestError.message));
  }, []);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(user) {
    setEditing(user);
    setForm({
      username: user.username || "",
      email: user.email || "",
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      municipio: String(user.municipio || ""),
      password: "",
    });
    setFormError("");
    setModalOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setFormError("");
      const payload = { ...form, municipio: Number(form.municipio) };
      if (!payload.password) delete payload.password;
      if (editing) await updateProvincialUser(editing.id, payload);
      else await createProvincialUser(payload);
      setModalOpen(false);
      setNotice(editing ? "El representante se actualizó correctamente." : "El representante se creó correctamente.");
      await loadUsers();
    } catch (requestError) {
      setFormError(requestError.message);
    }
  }

  async function toggleUser(user) {
    try {
      setError("");
      await updateProvincialUser(user.id, { is_active: !user.is_active });
      await loadUsers();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleDelete(user) {
    const ok = await confirm({
      title: "Eliminar usuario",
      message: `¿Eliminar el usuario ${displayName(user)}?`,
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    try {
      setError("");
      await deleteProvincialUser(user.id);
      await loadUsers();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch = normalize(
      `${displayName(user)} ${user.username} ${user.email} ${user.municipio_nombre}`
    ).includes(normalize(search));
    const matchesStatus = !statusFilter || (statusFilter === "activo" ? user.is_active : !user.is_active);
    return matchesSearch && matchesStatus;
  });

  const columns = [
    { key: "nombre", header: "Nombre", className: styles.strongCell, render: displayName },
    { key: "municipio", header: "Municipio", render: (user) => user.municipio_nombre || "-" },
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
    <div className={styles.page}>
      <Card padding="p-6">
        <div className={styles.headerRow}>
          <div>
            <p className={styles.eyebrow}>Usuarios</p>
            <h1 className={styles.title}>Representantes municipales</h1>
            <p className={styles.subtitle}>Gestiona los usuarios de los municipios de tu provincia.</p>
          </div>
          <PrimaryButton onClick={openCreate}>+ Nuevo</PrimaryButton>
        </div>
        {notice && <FeedbackMessage type="success" className={styles.feedbackMessage}>{notice}</FeedbackMessage>}
        {error && <FeedbackMessage type="error" className={styles.feedbackMessage}>{error}</FeedbackMessage>}
      </Card>

      <Card padding="p-6">
        <div className={styles.filtersGrid}>
          <Input className={styles.filterInput} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, usuario, correo o municipio" />
          <Select className={styles.filterInput} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">Todos los estados</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </Select>
        </div>
        <DataTable
          className={styles.table}
          columns={columns}
          data={filteredUsers}
          loading={loading}
          emptyMessage="No hay usuarios para mostrar."
        />
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar representante" : "Nuevo representante"}
        footer={
          <>
            <SecondaryButton onClick={() => setModalOpen(false)}>Cancelar</SecondaryButton>
            <PrimaryButton type="submit" form="repr-provincial-usuario-form">Guardar</PrimaryButton>
          </>
        }
      >
        <form id="repr-provincial-usuario-form" onSubmit={handleSubmit} className={styles.form}>
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
          <FormField label="Municipio">
            <Select required value={form.municipio} onChange={(event) => setForm({ ...form, municipio: event.target.value })}>
              <option value="">Selecciona un municipio</option>
              {municipios.map((municipio) => <option key={municipio.id} value={municipio.id}>{municipio.nombre}</option>)}
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
