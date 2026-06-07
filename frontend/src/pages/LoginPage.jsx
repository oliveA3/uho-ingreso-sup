import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/api";

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
    <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Iniciar sesión</h1>
      <p className="mt-2 text-sm text-slate-600">Accede con el usuario y contraseña de tu cuenta IngresoSUP.</p>
      {error && <div className="mt-6 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
      <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Usuario o correo</span>
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
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none"
            placeholder="••••••••"
            required
          />
        </label>
        <button type="submit" className="w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700">
          Iniciar sesión
        </button>
      </form>
    </div>
  );
}
