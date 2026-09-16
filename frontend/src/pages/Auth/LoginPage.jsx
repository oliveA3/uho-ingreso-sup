import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../../services/api";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import PrimaryButton from "../../components/Buttons/PrimaryButton";
import { Card, FormField, Input } from "../../components";
import styles from "./LoginPage.module.css";

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    try {
      const data = await login({ username, password });
      onLogin(data.user);
      navigate("/");
    } catch (err) {
      setError(err.message || "No se pudo iniciar sesión.");
    }
  };

  return (
    <div className={styles.wrapper}>
      <Card className="w-full max-w-xl" padding="p-8">
        <div className="mb-6">
          <button type="button" onClick={() => navigate("/")} className={styles.backLink}>
            ← Volver al inicio
          </button>
        </div>

        <h1 className={styles.title}>Iniciar sesión</h1>
        <p className={styles.subtitle}>
          Accede con el usuario y contraseña de tu cuenta IngresoSUP.
        </p>

        {error && <FeedbackMessage type="error" className="mt-6 rounded-2xl">{error}</FeedbackMessage>}

        <form className={styles.form} onSubmit={handleSubmit}>
          <FormField label="Usuario">
            <Input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="ej: maria.gonzalez25"
              required
            />
          </FormField>

          <FormField label="Contraseña">
            <div className={styles.passwordField}>
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={styles.passwordInput}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className={styles.toggleButton}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                <svg viewBox="0 0 24 24" className={styles.toggleIcon} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  {showPassword ? <><path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" /><circle cx="12" cy="12" r="2.5" /></> : <path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A10.7 10.7 0 0 1 12 4c5 0 8.5 4 9.5 6a11.8 11.8 0 0 1-4.1 4.5M6.2 6.2C3.9 7.5 2.5 9.5 2.5 10c1 2 4.5 6 9.5 6 1 0 1.9-.2 2.7-.5" />}
                </svg>
              </button>
            </div>
          </FormField>

          <PrimaryButton type="submit" className={styles.submitButton}>
            Iniciar sesión
          </PrimaryButton>
        </form>
      </Card>
    </div>
  );
}
