import styles from "./NewsSection.module.css";

const EMBED_HOSTS = {
  "youtube.com": (url) => {
    const id = url.searchParams.get("v") || (url.pathname.startsWith("/embed/") ? url.pathname.split("/")[2] : null);
    return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
  },
  "youtu.be": (url) => (url.pathname.length > 1 ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(url.pathname.slice(1))}` : null),
  "vimeo.com": (url) => {
    const id = url.pathname.split("/").filter(Boolean).pop();
    return /^\d+$/.test(id || "") ? `https://player.vimeo.com/video/${id}` : null;
  },
};

const DOCUMENT_LABELS = { pdf: "PDF", doc: "DOC", docx: "DOC", xls: "XLS", xlsx: "XLSX" };

function parseUrl(value) {
  try {
    const url = new URL(value, window.location.origin);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

/** Devuelve la URL embebible solo para proveedores permitidos (nunca un iframe a un origen arbitrario). */
export function toEmbedUrl(value) {
  const url = parseUrl(value);
  if (!url) return null;
  const host = url.hostname.replace(/^(www|m)\./, "");
  return EMBED_HOSTS[host]?.(url) ?? null;
}

export function documentFormat(item) {
  const declared = (item.documentFormat || "").toLowerCase();
  const fileName = item.mediaName || item.media_name || item.mediaUrl || item.media_url || "";
  const extension = fileName.split("?")[0].split("/").pop().split(".").pop().toLowerCase();
  return DOCUMENT_LABELS[declared] || DOCUMENT_LABELS[extension] || "DOC";
}

function Placeholder({ children }) {
  return <div className={styles.mediaFallback}>{children}</div>;
}

export default function NewsMedia({ item }) {
  const mediaType = item.mediaType || item.media_type;
  const url = parseUrl(item.mediaUrl || item.media_url);

  if (mediaType === "imagen" && url) {
    return <img className={styles.mediaImage} src={url.href} alt={item.imageAlt || item.title} loading="lazy" />;
  }

  if (mediaType === "video") {
    const embed = toEmbedUrl(item.mediaUrl || item.media_url);
    if (embed) {
      return (
        <iframe
          className={styles.mediaVideo}
          src={embed}
          title={`Video: ${item.title}`}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      );
    }
    const fileName = item.mediaName || item.media_name || url?.pathname || "";
    if (url && /\.(mp4|webm|ogg)$/i.test(fileName)) {
      return (
        <video className={styles.mediaVideo} controls preload="metadata" aria-label={item.title}>
          <source src={url.href} />
          Tu navegador no puede reproducir este video.
        </video>
      );
    }
    return <Placeholder>Video próximamente</Placeholder>;
  }

  if (mediaType === "documento") {
    const format = documentFormat({ ...item, mediaUrl: item.mediaUrl || item.media_url });
    if (!url || item.mediaUrl === "#") return <Placeholder>Documento {format} próximamente</Placeholder>;
    return (
      <a className={styles.documentLink} href={item.mediaDownloadUrl || item.media_download_url || url.href} download>
        <span className={styles.documentBadge}>{format}</span>
        <span>
          <strong>{item.mediaName || item.media_name || "Descargar documento"}</strong>
          <small>Descargar archivo {format}</small>
        </span>
      </a>
    );
  }

  return null;
}
