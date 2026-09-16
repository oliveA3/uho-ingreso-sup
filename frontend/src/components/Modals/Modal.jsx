import { useEffect } from "react";
import styles from "./Modal.module.css";

const SIZE_CLASSES = {
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
  xl: styles.sizeXl,
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  closeOnOverlayClick = true,
}) {
  useEffect(() => {
    if (!open) return undefined;
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const hasHeader = Boolean(title || description || onClose);

  return (
    <div className={styles.overlay} onClick={closeOnOverlayClick ? onClose : undefined}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        className={`${styles.dialog} ${SIZE_CLASSES[size] || SIZE_CLASSES.md}`}
        onClick={(event) => event.stopPropagation()}
      >
        {hasHeader && (
          <div className={styles.header}>
            <div>
              {title && <h2 className={styles.title}>{title}</h2>}
              {description && <p className={styles.description}>{description}</p>}
            </div>
            {onClose && (
              <button type="button" onClick={onClose} className={styles.closeButton} aria-label="Cerrar">
                &times;
              </button>
            )}
          </div>
        )}

        <div className={title || description ? styles.bodyWithHeader : styles.body}>{children}</div>

        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
}
