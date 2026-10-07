import { useState } from "react";
import PrimaryButton from "../Buttons/PrimaryButton";
import SecondaryButton from "../Buttons/SecondaryButton";
import Modal from "../Modals/Modal";
import ExternalLinkIcon from "../Icons/ExternalLinkIcon";
import NewsMedia from "./NewsMedia";
import styles from "./NewsSection.module.css";

function formatDate(value) {
  if (!value) return "";
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("es-CU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function NewsSection({ items = [], provinceName }) {
  const [selectedNews, setSelectedNews] = useState(null);
  const [showAllNews, setShowAllNews] = useState(false);
  const visibleItems = items.slice(0, 4);

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div>
          <p id="noticias" className={styles.eyebrow}>Noticias</p>
          <h2 className={styles.title}>Actualizaciones del proceso de ingreso</h2>
          {provinceName && <p className={styles.province}>{provinceName}</p>}
        </div>
        {items.length > 4 && <SecondaryButton className={styles.moreTop} onClick={() => setShowAllNews(true)}>Ver más</SecondaryButton>}
      </div>
      <div className={styles.grid}>
        {items.length === 0 ? (
          <p className={styles.empty} role="status" aria-live="polite">No hay noticias que mostrar.</p>
        ) : visibleItems.map((item) => {
          const mediaType = item.media_type || item.mediaType;
          const mediaUrl = item.media_url || item.mediaUrl;
          const coverUrl = item.cover_url || item.coverUrl;
          const mediaDownloadUrl = item.media_download_url || item.mediaDownloadUrl;
          const coverDownloadUrl = item.cover_download_url || item.coverDownloadUrl;
          const newsTitle = item.title || item.titulo;
          const newsDescription = item.description || item.contenido;
          const previewImageUrl = coverUrl || (mediaType === "imagen" ? mediaUrl : null);
          const mediaItem = {
            ...item,
            mediaType,
            mediaUrl,
            coverUrl,
            mediaName: item.media_name || item.mediaName,
            mediaDownloadUrl,
          };
          const externalUrl = item.external_url || item.url_externa;
          const showMediaDownload = mediaDownloadUrl && (mediaType !== "documento" || coverUrl);
          const primaryDownloadUrl = showMediaDownload ? mediaDownloadUrl : coverDownloadUrl;
          return (
            <article key={item.id} className={styles.card}>
              {mediaType && mediaType !== "texto" && (
                <div className={styles.mediaWrapper}>
                  {mediaType === "imagen" && previewImageUrl ? (
                    <button
                      type="button"
                      className={styles.mediaOpen}
                      onClick={() => setSelectedNews(item)}
                      aria-label={`Abrir noticia: ${newsTitle}`}
                    >
                      <img className={styles.mediaImage} src={previewImageUrl} alt={newsTitle} loading="lazy" />
                    </button>
                  ) : coverUrl && mediaType !== "video" ? (
                    <button
                      type="button"
                      className={styles.mediaOpen}
                      onClick={() => setSelectedNews(item)}
                      aria-label={`Abrir noticia: ${newsTitle}`}
                    >
                      <img className={styles.mediaImage} src={coverUrl} alt={newsTitle} loading="lazy" />
                    </button>
                  ) : <NewsMedia item={mediaItem} />}
                </div>
              )}
              <div className={styles.meta}>
                <span>Noticia</span>
                <div className={styles.metaRight}>
                  {externalUrl && (
                    <a
                      className={styles.externalLinkButton}
                      href={externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      aria-label="Abrir enlace externo"
                      title="Abrir enlace externo"
                    >
                      <ExternalLinkIcon size={14} />
                    </a>
                  )}
                  <span>{formatDate(item.date)}</span>
                </div>
              </div>
              <button
                type="button"
                className={styles.storyOpen}
                onClick={() => setSelectedNews(item)}
                aria-label={`Abrir noticia: ${newsTitle}`}
              >
                <h3 className={styles.cardTitle}>{newsTitle}</h3>
                <p className={styles.description}>{newsDescription}</p>
              </button>
              {primaryDownloadUrl && (
                <div className={styles.downloads}>
                  <a href={primaryDownloadUrl} download>Descargar material</a>
                </div>
              )}
            </article>
          );
        })}
      </div>
      {items.length > 4 && <SecondaryButton className={styles.moreBottom} onClick={() => setShowAllNews(true)}>Ver más</SecondaryButton>}
      {showAllNews && (
        <Modal
          open
          onClose={() => setShowAllNews(false)}
          title="Noticias"
          description={provinceName || "Publicaciones de la provincia"}
          size="xl"
          bodyClassName={styles.allNewsBody}
        >
          <div className={styles.allNewsList}>
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={styles.allNewsItem}
                onClick={() => {
                  setShowAllNews(false);
                  setSelectedNews(item);
                }}
              >
                <span className={styles.allNewsTitle}>{item.title || item.titulo}</span>
                <span className={styles.allNewsDescription}>{item.description || item.contenido}</span>
                <span className={styles.allNewsDate}>{formatDate(item.date)}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}
      {selectedNews && (
        <Modal
          open
          onClose={() => setSelectedNews(null)}
          title={selectedNews.title || selectedNews.titulo}
          size="lg"
          footer={(
            <>
              <SecondaryButton onClick={() => setSelectedNews(null)}>Cerrar</SecondaryButton>
              {(selectedNews.external_url || selectedNews.url_externa) && (
                <PrimaryButton
                  as="a"
                  href={selectedNews.external_url || selectedNews.url_externa}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ver página
                </PrimaryButton>
              )}
            </>
          )}
        >
          {(() => {
            const mediaType = selectedNews.media_type || selectedNews.mediaType;
            const imageUrl = selectedNews.cover_url
              || selectedNews.coverUrl
              || (mediaType === "imagen" ? selectedNews.media_url || selectedNews.mediaUrl : null);
            const description = selectedNews.description || selectedNews.contenido;
            return (
              <div className={styles.detail}>
                {imageUrl && (
                  <img
                    className={styles.detailImage}
                    src={imageUrl}
                    alt={selectedNews.title || selectedNews.titulo}
                  />
                )}
                <p className={styles.detailDescription}>{description}</p>
              </div>
            );
          })()}
        </Modal>
      )}
    </section>
  );
}
