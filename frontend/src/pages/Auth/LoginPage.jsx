import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../../services/api";
import FeedbackMessage from "../../components/FeedbackMessage";

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
    <div className="my-12 flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        {/* Botón Volver al Landing Page */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-800"
          >
            ← Volver al inicio
          </button>
        </div>

        <h1 className="text-2xl font-semibold text-slate-900">Iniciar sesión</h1>
        <p className="mt-2 text-sm text-slate-600">
          Accede con el usuario y contraseña de tu cuenta IngresoSUP.
        </p>

        {error && <FeedbackMessage type="error" className="mt-6 rounded-2xl">{error}</FeedbackMessage>}

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Usuario</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none"
              placeholder="ej: maria.gonzalez25"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Contraseña</span>
            <div className="relative mt-2">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-16 text-sm text-slate-900 focus:border-sky-500 focus:outline-none"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-800"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  {showPassword ? <><path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" /><circle cx="12" cy="12" r="2.5" /></> : <path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A10.7 10.7 0 0 1 12 4c5 0 8.5 4 9.5 6a11.8 11.8 0 0 1-4.1 4.5M6.2 6.2C3.9 7.5 2.5 9.5 2.5 10c1 2 4.5 6 9.5 6 1 0 1.9-.2 2.7-.5" />}
                </svg>
              </button>
            </div>
          </label>

          <button
            type="submit"
            className="w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
          >
            Iniciar sesión
          </button>
        </form>
      </div>
    </div>
  );
}
