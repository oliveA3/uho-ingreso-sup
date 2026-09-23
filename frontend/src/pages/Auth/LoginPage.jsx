import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../../api/auth.service";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import PrimaryButton from "../../components/Buttons/PrimaryButton";
import { Card, FormField, Input } from "../../components";
import styles from "./LoginPage.module.css";

const validateField = (field, value) => {
  const trimmed = value.trim();

  if (field === "username") {
    if (!trimmed) return "Escribe tu usuario para continuar.";
    if (trimmed.length < 4) return "El usuario debe tener al menos 4 caracteres.";
    return "";
  }

  if (field === "password") {
    if (!trimmed) return "Escribe tu contraseña.";
    if (trimmed.length < 6) return "La contraseña debe tener al menos 6 caracteres.";
    return "";
  }

  return "";
};

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const navigate = useNavigate();

  const handleUsernameChange = (event) => {
    const value = event.target.value;
    setUsername(value);
    setUsernameError(validateField("username", value));
    setError(null);
  };

  const handlePasswordChange = (event) => {
    const value = event.target.value;
    setPassword(value);
    setPasswordError(validateField("password", value));
    setError(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    const nextUsernameError = validateField("username", username);
    const nextPasswordError = validateField("password", password);
    setUsernameError(nextUsernameError);
    setPasswordError(nextPasswordError);

    if (nextUsernameError || nextPasswordError) {
      return;
    }

    try {
      const data = await login({ username: username.trim(), password: password.trim() });
      onLogin(data.user);
      navigate("/");
    } catch (err) {
      setError(err.message || "No se pudo iniciar sesión. Verifica los datos e intenta otra vez.");
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
          Accede con tu usuario y contraseña para entrar al sistema IngresoSUP.
        </p>

        {error && <FeedbackMessage type="error" className="mt-6 rounded-2xl">{error}</FeedbackMessage>}

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <FormField
            htmlFor="login-username"
            label="Usuario"
            required
            error={usernameError}
            errorId="login-username-error"
          >
            <Input
              id="login-username"
              name="username"
              value={username}
              onChange={handleUsernameChange}
              placeholder="ej: maria.gonzalez25"
              required
              invalid={Boolean(usernameError)}
              aria-describedby={usernameError ? "login-username-error" : undefined}
            />
          </FormField>

          <FormField
            htmlFor="login-password"
            label="Contraseña"
            required
            error={passwordError}
            errorId="login-password-error"
          >
            <div className={styles.passwordField}>
              <Input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={handlePasswordChange}
                className={styles.passwordInput}
                placeholder="••••••••"
                required
                invalid={Boolean(passwordError)}
                aria-describedby={passwordError ? "login-password-error" : undefined}
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
