import Modal from "./Modal";
import TextArea from "../TextArea/TextArea";
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
      <TextArea autoFocus value={cause} onChange={onCauseChange} placeholder="Causa de la revisión" className={styles.textarea} />
    </Modal>
  );
}
