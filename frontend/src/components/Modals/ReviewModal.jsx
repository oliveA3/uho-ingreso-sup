import Modal from "./Modal";
import TextArea from "../TextArea/TextArea";
import FormField from "../FormField/FormField";
import PrimaryButton from "../Buttons/PrimaryButton";
import SecondaryButton from "../Buttons/SecondaryButton";
import styles from "./ReviewModal.module.css";

export default function ReviewModal({ cause, onCauseChange, onCancel, onSubmit }) {
  return (
    <Modal
      open
      onClose={onCancel}
      size="md"
      title="Solicitar revisión"
      description="Describe por qué deseas revisar tus índices."
      footer={
        <>
          <SecondaryButton onClick={onCancel}>Cancelar</SecondaryButton>
          <PrimaryButton type="button" onClick={onSubmit} disabled={!cause.trim()}>
            Enviar solicitud
          </PrimaryButton>
        </>
      }
    >
      <FormField label="Motivo de la revisión">
        <TextArea required autoFocus value={cause} onChange={onCauseChange} placeholder="Explica el motivo de tu solicitud" className={styles.textarea} />
      </FormField>
    </Modal>
  );
}
