import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { confirmPasswordReset } from "../../api/auth.service";
import { Card, FormField, Input } from "../../components";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import PrimaryButton from "../../components/Buttons/PrimaryButton";
import styles from "./AuthRecoveryPage.module.css";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const uid = searchParams.get("uid") || "";
  const token = searchParams.get("token") || "";

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    try {
      const result = await confirmPasswordReset({ uid, token, new_password: password });
      setMessage(result.detail);
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(err.message || "No se pudo restablecer la contraseña.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <Card className={styles.card} padding="p-6">
        <Link to="/login" className={styles.backLink}>← Volver al inicio de sesión</Link>
        <h1 className={styles.title}>Crear nueva contraseña</h1>
        <p className={styles.subtitle}>El enlace es de un solo uso y vence según el plazo de seguridad del sistema.</p>
        {error && <FeedbackMessage type="error" className={styles.feedback}>{error}</FeedbackMessage>}
        {message && <FeedbackMessage type="success" className={styles.feedback}>{message}</FeedbackMessage>}
        <form className={styles.form} onSubmit={submit}>
          <FormField htmlFor="reset-password" label="Nueva contraseña" required>
            <Input id="reset-password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required />
          </FormField>
          <FormField htmlFor="reset-confirmation" label="Repetir contraseña" required>
            <Input id="reset-confirmation" type="password" autoComplete="new-password" minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required />
          </FormField>
          <PrimaryButton type="submit" disabled={busy || !uid || !token}>{busy ? "Guardando..." : "Guardar contraseña"}</PrimaryButton>
        </form>
      </Card>
    </div>
  );
}
