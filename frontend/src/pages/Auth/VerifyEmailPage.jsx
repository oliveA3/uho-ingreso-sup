import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resendVerificationCode, verifyEmail } from "../../api/auth.service";
import { Card, FormField, Input } from "../../components";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import PrimaryButton from "../../components/Buttons/PrimaryButton";
import styles from "./AuthRecoveryPage.module.css";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [username, setUsername] = useState(searchParams.get("usuario") || "");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await verifyEmail({ username: username.trim(), code: code.trim() });
      setMessage("Correo verificado. Ya puedes iniciar sesión.");
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setError(err.message || "No se pudo verificar el correo.");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await resendVerificationCode({ username: username.trim() });
      setMessage(result.detail);
    } catch (err) {
      setError(err.message || "No se pudo solicitar otro código.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <Card className={styles.card} padding="p-6">
        <Link to="/login" className={styles.backLink}>← Volver al inicio de sesión</Link>
        <h1 className={styles.title}>Verificar correo</h1>
        <p className={styles.subtitle}>Introduce el código de seis dígitos enviado a tu correo. Los códigos vencen en 15 minutos.</p>
        {error && <FeedbackMessage type="error" className={styles.feedback}>{error}</FeedbackMessage>}
        {message && <FeedbackMessage type="success" className={styles.feedback}>{message}</FeedbackMessage>}
        <form className={styles.form} onSubmit={submit}>
          <FormField htmlFor="verify-username" label="Usuario" required>
            <Input id="verify-username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required />
          </FormField>
          <FormField htmlFor="verify-code" label="Código de verificación" required>
            <Input id="verify-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value)} required />
          </FormField>
          <PrimaryButton type="submit" disabled={busy}>{busy ? "Verificando..." : "Verificar correo"}</PrimaryButton>
          <button type="button" className={styles.textButton} onClick={resend} disabled={busy}>Solicitar un nuevo código</button>
        </form>
      </Card>
    </div>
  );
}
