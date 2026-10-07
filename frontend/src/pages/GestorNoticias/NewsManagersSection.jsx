import { useEffect, useState } from "react";
import {
  createNewsManager,
  deleteNewsManager,
  fetchNewsManagers,
  updateNewsManager,
} from "../../api/news.service";
import EntityActionButton from "../../components/Buttons/EntityActionButton";
import StatusToggle from "../../components/Buttons/StatusToggle";
import PrimaryButton from "../../components/Buttons/PrimaryButton";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import { DataTable, NewsManagerModal, useConfirm } from "../../components";
import styles from "./NewsManagersSection.module.css";

const nameOf = (manager) => `${manager.first_name || ""} ${manager.last_name || ""}`.trim() || manager.username;

export default function NewsManagersSection() {
  const confirm = useConfirm();
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  async function loadManagers() {
    try {
      setLoading(true);
      setError("");
      setManagers(await fetchNewsManagers());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadManagers();
  }, []);

  function openCreate() {
    setEditing(null);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(manager) {
    setEditing(manager);
    setFormError("");
    setModalOpen(true);
  }

  async function handleModalSubmit(payload) {
    try {
      setSaving(true);
      setFormError("");
      if (editing) await updateNewsManager(editing.id, payload);
      else await createNewsManager(payload);
      setModalOpen(false);
      setNotice(editing ? "El gestor se actualizó correctamente." : "El gestor se creó correctamente.");
      await loadManagers();
    } catch (requestError) {
      setFormError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(manager) {
    try {
      setError("");
      await updateNewsManager(manager.id, { is_active: !manager.is_active });
      await loadManagers();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleDelete(manager) {
    const accepted = await confirm({
      title: "Eliminar gestor de noticias",
      message: `¿Eliminar a ${nameOf(manager)}?`,
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!accepted) return;
    try {
      setError("");
      await deleteNewsManager(manager.id);
      await loadManagers();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const columns = [
    { key: "nombre", header: "Nombre", render: nameOf },
    { key: "usuario", header: "Usuario", render: (manager) => manager.username },
    { key: "correo", header: "Correo", render: (manager) => manager.email },
    { key: "estado", header: "Estado", render: (manager) => <StatusToggle active={manager.is_active} onClick={() => toggleActive(manager)} /> },
    {
      key: "acciones",
      header: "Acciones",
      render: (manager) => (
        <>
          <EntityActionButton variant="edit" onClick={() => openEdit(manager)}>Editar</EntityActionButton>
          <EntityActionButton variant="delete" onClick={() => handleDelete(manager)}>Eliminar</EntityActionButton>
        </>
      ),
    },
  ];

  return (
    <section className={styles.section}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>Gestores de noticias</h2>
          <p className={styles.subtitle}>Administra las cuentas que pueden publicar noticias en tu provincia.</p>
        </div>
        <PrimaryButton onClick={openCreate}>+ Nuevo gestor</PrimaryButton>
      </div>
      {notice && <FeedbackMessage type="success" className={styles.feedbackMessage}>{notice}</FeedbackMessage>}
      {error && <FeedbackMessage type="error" className={styles.feedbackMessage}>{error}</FeedbackMessage>}
      <DataTable
        className={styles.table}
        columns={columns}
        data={managers}
        loading={loading}
        loadingMessage="Cargando gestores..."
        emptyMessage="No hay gestores de noticias para tu provincia."
        maxHeight="12.5rem"
      />

      {modalOpen && (
        <NewsManagerModal
          manager={editing}
          saving={saving}
          error={formError}
          onClose={() => setModalOpen(false)}
          onSubmit={handleModalSubmit}
        />
      )}
    </section>
  );
}
