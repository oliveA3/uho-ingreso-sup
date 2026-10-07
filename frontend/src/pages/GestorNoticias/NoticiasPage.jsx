import { useEffect, useState } from "react";
import {
  createProvincialNews,
  deleteProvincialNews,
  fetchProvincialNews,
  updateProvincialNews,
} from "../../api/news.service";
import EntityActionButton from "../../components/Buttons/EntityActionButton";
import PrimaryButton from "../../components/Buttons/PrimaryButton";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import ExternalLinkIcon from "../../components/Icons/ExternalLinkIcon";
import { Card, NewsModal, PageHeader, useConfirm } from "../../components";
import NewsManagersSection from "./NewsManagersSection";
import styles from "./NoticiasPage.module.css";

function displayDate(value) {
  if (!value) return "Permanente";
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("es-CU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function isExpired(news) {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return !news.permanente && news.fecha_expiracion && news.fecha_expiracion < today;
}

export default function NoticiasPage({ user }) {
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadNews() {
    try {
      setLoading(true);
      setError("");
      setItems(await fetchProvincialNews());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNews();
  }, []);

  function openCreate() {
    setEditing(null);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(news) {
    setEditing(news);
    setFormError("");
    setModalOpen(true);
  }

  async function handleModalSubmit(payload) {
    try {
      setSaving(true);
      setFormError("");
      if (editing) await updateProvincialNews(editing.id, payload);
      else await createProvincialNews(payload);
      setModalOpen(false);
      setNotice(editing ? "La noticia se actualizó correctamente." : "La noticia se creó correctamente.");
      await loadNews();
    } catch (requestError) {
      setFormError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(news) {
    const accepted = await confirm({
      title: "Eliminar noticia",
      message: `¿Eliminar «${news.titulo}» y sus archivos?`,
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!accepted) return;
    try {
      setError("");
      await deleteProvincialNews(news.id);
      await loadNews();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <div className={styles.page}>
      <Card padding="p-6">
        <PageHeader
          eyebrow="Gestión provincial"
          title="Noticias"
          subtitle="Publica comunicados y noticias del proceso de ingreso para los aspirantes de tu provincia."
          actions={<PrimaryButton onClick={openCreate}>+ Nueva noticia</PrimaryButton>}
        />
        {notice && <FeedbackMessage type="success" className={styles.errorMessage}>{notice}</FeedbackMessage>}
        {error && <FeedbackMessage type="error" className={styles.errorMessage}>{error}</FeedbackMessage>}
        {user?.rol === "jefe_comision" && <NewsManagersSection />}
      </Card>

      {loading && items.length === 0 ? (
        <p className={styles.loadingState} role="status">Cargando noticias...</p>
      ) : items.length === 0 ? (
        <p className={styles.emptyState} role="status">No hay noticias para esta provincia.</p>
      ) : (
        <div className={styles.newsGrid}>
          {items.map((news) => {
            const expired = isExpired(news);
            const status = expired ? "Expirada" : news.permanente ? "Permanente" : "Publicada";
            const statusClass = expired ? styles.statusExpired : news.permanente ? styles.statusPermanent : styles.statusPublished;
            const preview = news.imagen_portada_url
              || (news.multimedia_tipo === "imagen" ? news.multimedia_url : null);
            const downloadUrl = news.multimedia_download_url || news.imagen_portada_download_url;

            return (
              <Card
                key={news.id}
                as="article"
                padding={styles.newsCardPadding}
                className={styles.newsCard}
              >
                {preview && <img className={styles.newsThumbnail} src={preview} alt="" loading="lazy" />}
                <div className={styles.newsCardBody}>
                  <div className={styles.newsCardHeader}>
                    <h2 className={styles.newsCardTitle}>{news.titulo}</h2>
                    <div className={styles.headerActions}>
                      {news.url_externa && (
                        <a
                          className={styles.externalLinkButton}
                          href={news.url_externa}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Abrir enlace externo"
                          title="Abrir enlace externo"
                        >
                          <ExternalLinkIcon size={14} />
                        </a>
                      )}
                      <span className={`${styles.statusBadge} ${statusClass}`}>{status}</span>
                    </div>
                  </div>
                  <p className={styles.newsSummary}>{news.contenido}</p>
                  <div className={styles.newsMetadata}>
                    <span>Expira: {displayDate(news.fecha_expiracion)}</span>
                    {downloadUrl && (
                      <a className={styles.fileLink} href={downloadUrl}>
                        Descargar material
                      </a>
                    )}
                  </div>
                  <div className={styles.cardActions}>
                    <EntityActionButton variant="edit" onClick={() => openEdit(news)}>Editar</EntityActionButton>
                    <EntityActionButton variant="delete" onClick={() => handleDelete(news)}>Eliminar</EntityActionButton>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <NewsModal
          news={editing}
          saving={saving}
          error={formError}
          onClose={() => setModalOpen(false)}
          onSubmit={handleModalSubmit}
        />
      )}
    </div>
  );
}
