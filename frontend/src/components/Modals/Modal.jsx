import { useEffect, useRef } from "react";
import styles from "./Modal.module.css";

const SIZE_CLASSES = {
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
  xl: styles.sizeXl,
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
  const dialogRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  // Gestiona el foco como exige un diálogo modal accesible (WCAG 2.4.3):
  // al abrir, mueve el foco dentro del diálogo; mientras está abierto, Tab/
  // Shift+Tab quedan atrapados dentro de él; al cerrar, el foco vuelve al
  // elemento que lo abrió.
  useEffect(() => {
    if (!open) return undefined;
    previouslyFocusedRef.current = document.activeElement;
    const dialogNode = dialogRef.current;
    const initialFocusable = dialogNode?.querySelector(FOCUSABLE_SELECTOR);
    (initialFocusable || dialogNode)?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose?.();
        return;
      }
      if (event.key !== "Tab" || !dialogNode) return;
      const focusable = dialogNode.querySelectorAll(FOCUSABLE_SELECTOR);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previouslyFocusedRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const hasHeader = Boolean(title || description || onClose);

  return (
    <div className={styles.overlay} onClick={closeOnOverlayClick ? onClose : undefined}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
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
