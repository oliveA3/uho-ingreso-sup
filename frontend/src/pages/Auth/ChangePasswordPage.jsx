import { useState } from "react";
import { changePassword } from "../../api/auth.service";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import PrimaryButton from "../../components/Buttons/PrimaryButton";
import SecondaryButton from "../../components/Buttons/SecondaryButton";
import { Card, FormField, Input } from "../../components";
import styles from "./ChangePasswordPage.module.css";

export default function ChangePasswordPage({ onChanged, onLogout }) {
  const [form, setForm] = useState({ current_password: "", new_password: "", confirm: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    if (form.new_password !== form.confirm) {
      setError("La confirmación no coincide con la nueva contraseña. Vuelve a escribirla.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await changePassword({ current_password: form.current_password, new_password: form.new_password });
      onChanged();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <Card padding="p-8" className={styles.card}>
        <p className={styles.eyebrow}>Seguridad de la cuenta</p>
        <h1 className={styles.title}>Cambia tu contraseña temporal</h1>
        <p className={styles.description}>
          Tu cuenta fue creada por un administrador con una contraseña temporal. Por seguridad, debes definir una propia para continuar.
        </p>
        {error && <FeedbackMessage type="error" className="mt-4 rounded-2xl">{error}</FeedbackMessage>}
        <form onSubmit={handleSubmit} className={styles.form}>
          <FormField label="Contraseña actual (temporal)" required>
            <Input type="password" autoComplete="current-password" value={form.current_password} onChange={update("current_password")} required />
          </FormField>
          <FormField label="Nueva contraseña" required>
            <Input type="password" autoComplete="new-password" minLength={8} value={form.new_password} onChange={update("new_password")} required />
          </FormField>
          <FormField label="Confirmar nueva contraseña" required>
            <Input type="password" autoComplete="new-password" minLength={8} value={form.confirm} onChange={update("confirm")} required />
          </FormField>
          <div className={styles.actions}>
            <PrimaryButton type="submit" disabled={saving}>{saving ? "Guardando..." : "Cambiar contraseña"}</PrimaryButton>
            <SecondaryButton type="button" onClick={onLogout} disabled={saving}>Cerrar sesión</SecondaryButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
