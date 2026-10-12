import { FormField, Input } from "..";
import FeedbackMessage from "../FeedbackMessage/FeedbackMessage";
import Modal from "./Modal";
import PrimaryButton from "../Buttons/PrimaryButton";
import SecondaryButton from "../Buttons/SecondaryButton";
import styles from "./CreateStudentAccountModal.module.css";

export default function CreateStudentAccountModal({
  open,
  student,
  form,
  error,
  submitting = false,
  onClose,
  onSubmit,
  onChange,
}) {
  const studentName = student ? `${student.nombre} ${student.apellidos}` : "";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={student ? `Crear cuenta para ${studentName}` : "Crear cuenta"}
      footer={
        <>
          <SecondaryButton onClick={onClose} disabled={submitting}>Cancelar</SecondaryButton>
          <PrimaryButton
            type="submit"
            form="create-student-account-form"
            disabled={submitting}
          >
            {submitting ? "Creando..." : "Crear cuenta"}
          </PrimaryButton>
        </>
      }
    >
      <form id="create-student-account-form" onSubmit={onSubmit} className={styles.form}>
        {error && <FeedbackMessage type="error" className={styles.formError}>{error}</FeedbackMessage>}
        <p className={styles.help}>
          Define el nombre de usuario y la contraseña que el estudiante utilizará para iniciar sesión. Los datos de inicio de sesión se enviarán al correo electrónico del estudiante. Si no se define una contraseña, se generará una automáticamente.
        </p>

        <FormField label="Nombre de usuario">
          <Input
            required
            name="username"
            autoComplete="username"
            maxLength={150}
            placeholder="Ej. nombre.apellido"
            value={form.username}
            onChange={(event) => onChange("username", event.target.value)}
            disabled={submitting}
          />
        </FormField>

        <FormField label="Correo electrónico">
          <Input
            required
            name="email"
            autoComplete="email"
            type="email"
            value={form.email}
            onChange={(event) => onChange("email", event.target.value)}
            disabled={submitting}
          />
        </FormField>

        <FormField label={<>Contraseña temporal <small>(opcional)</small></>}>
          <Input
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={form.password}
            onChange={(event) => onChange("password", event.target.value)}
            disabled={submitting}
          />
        </FormField>
      </form>
    </Modal>
  );
}
