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

const DOCUMENT_LABELS = { pdf: "PDF", doc: "DOC", docx: "DOC" };

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
  const extension = (item.mediaUrl || "").split("?")[0].split(".").pop().toLowerCase();
  return DOCUMENT_LABELS[declared] || DOCUMENT_LABELS[extension] || "DOC";
}

function Placeholder({ children }) {
  return <div className={styles.mediaFallback}>{children}</div>;
}

export default function NewsMedia({ item }) {
  const url = parseUrl(item.mediaUrl);

  if (item.mediaType === "imagen" && url) {
    return <img className={styles.mediaImage} src={url.href} alt={item.imageAlt || item.title} loading="lazy" />;
  }

  if (item.mediaType === "video") {
    const embed = toEmbedUrl(item.mediaUrl);
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
    if (url && /\.(mp4|webm|ogg)$/i.test(url.pathname)) {
      return (
        <video className={styles.mediaVideo} controls preload="metadata" aria-label={item.title}>
          <source src={url.href} />
          Tu navegador no puede reproducir este video.
        </video>
      );
    }
    return <Placeholder>Video próximamente</Placeholder>;
  }

  if (item.mediaType === "documento") {
    const format = documentFormat(item);
    if (!url || item.mediaUrl === "#") return <Placeholder>Documento {format} próximamente</Placeholder>;
    return (
      <a className={styles.documentLink} href={url.href} download target="_blank" rel="noopener noreferrer">
        <span className={styles.documentBadge}>{format}</span>
        <span>
          <strong>{item.documentName || "Descargar documento"}</strong>
          <small>Descargar archivo {format}</small>
        </span>
      </a>
    );
  }

  return null;
}
