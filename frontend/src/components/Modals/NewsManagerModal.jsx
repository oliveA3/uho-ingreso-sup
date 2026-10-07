import { useState } from "react";
import Modal from "./Modal";
import FormField from "../FormField/FormField";
import Input from "../Input/Input";
import PrimaryButton from "../Buttons/PrimaryButton";
import SecondaryButton from "../Buttons/SecondaryButton";
import FeedbackMessage from "../FeedbackMessage/FeedbackMessage";
import styles from "./NewsManagerModal.module.css";

function buildInitialForm(manager) {
  return {
    username: manager?.username || "",
    email: manager?.email || "",
    first_name: manager?.first_name || "",
    last_name: manager?.last_name || "",
    is_active: manager ? Boolean(manager.is_active) : true,
    password: "",
  };
}

export default function NewsManagerModal({ manager = null, saving = false, error = "", onClose, onSubmit }) {
  const [form, setForm] = useState(() => buildInitialForm(manager));

  function handleSubmit(event) {
    event.preventDefault();
    const payload = { ...form };
    if (!payload.password) delete payload.password;
    if (manager) delete payload.username;
    onSubmit(payload);
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={manager ? "Editar gestor de noticias" : "Nuevo gestor de noticias"}
      footer={(
        <>
          <SecondaryButton onClick={onClose}>Cancelar</SecondaryButton>
          <PrimaryButton type="submit" form="news-manager-form" disabled={saving}>
            {saving ? "Guardando..." : "Guardar"}
          </PrimaryButton>
        </>
      )}
    >
      <form id="news-manager-form" onSubmit={handleSubmit} className={styles.form}>
        {error && <FeedbackMessage type="error" className={styles.formError}>{error}</FeedbackMessage>}
        <FormField label="Nombre">
          <Input name="first_name" autoComplete="given-name" required value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} />
        </FormField>
        <FormField label="Apellidos">
          <Input name="last_name" autoComplete="family-name" required value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} />
        </FormField>
        <FormField label="Usuario">
          <Input
            name="username"
            autoComplete="username"
            required
            disabled={Boolean(manager)}
            value={form.username}
            onChange={(event) => setForm({ ...form, username: event.target.value })}
          />
        </FormField>
        <FormField label="Correo">
          <Input name="email" autoComplete="email" required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        </FormField>
        <FormField
          label={<>Contraseña{manager && <span className={styles.passwordHint}> (dejar vacía para conservarla)</span>}</>}
        >
          <Input
            name="password"
            autoComplete="new-password"
            required={!manager}
            minLength="8"
            type="password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
        </FormField>
        <label className={styles.activeToggle}>
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
          />
          Gestor activo
        </label>
      </form>
    </Modal>
  );
}
