import { Children, cloneElement, isValidElement, useId } from "react";
import styles from "./FormField.module.css";

export default function FormField({
  label,
  htmlFor,
  children,
  className = "",
  error,
  errorId,
  required = false,
}) {
  const generatedId = useId();
  const resolvedErrorId = errorId || `${generatedId}-error`;

  // Cuando el caller no indica `htmlFor` explícito, y `children` es un único
  // elemento (el caso normal: un <Input>/<Select>/<TextArea>), le inyectamos
  // un id generado para que el <label> quede asociado programáticamente con
  // el control, como exige WCAG 1.3.1/4.1.2, sin que cada página tenga que
  // repetir el cableado manualmente.
  const singleChild = Children.count(children) === 1 && isValidElement(children) ? children : null;
  const resolvedHtmlFor = htmlFor || (singleChild ? singleChild.props.id || generatedId : undefined);

  const content = singleChild
    ? cloneElement(singleChild, {
        id: singleChild.props.id || resolvedHtmlFor,
        "aria-describedby": error
          ? [singleChild.props["aria-describedby"], resolvedErrorId].filter(Boolean).join(" ")
          : singleChild.props["aria-describedby"],
      })
    : children;

  return (
    <div className={`${styles.field} ${className}`}>
      <div className={styles.labelRow}>
        <label htmlFor={resolvedHtmlFor} className={styles.label}>
          {label}
          {required && <span className={styles.requiredMark} aria-hidden="true">*</span>}
        </label>
      </div>
      {content}
      {error && (
        <span id={resolvedErrorId} className={styles.error} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
