import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { register } from "../services/api";

export default function RegisterPage() {
  const [form, setForm] = useState({
    ci: "",
    nombre: "",
    apellidos: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  const updateField = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    try {
      await register({
        ci: form.ci,
        nombre: form.nombre,
        apellidos: form.apellidos,
        email: form.email,
        username: form.username,
        password: form.password,
      });
      setSuccess("Registro exitoso. Por favor inicia sesión.");
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setError(err.message || "No se pudo crear la cuenta.");
    }
  };

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Registro estudiantil</h1>
      <p className="mt-2 text-sm text-slate-600">Solo estudiantes del proceso pueden registrarse. El registro queda ligado al rol Estudiante.</p>
      {error && <div className="mt-6 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
      {success && <div className="mt-6 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</div>}
      <form className="mt-6 grid gap-5 md:grid-cols-2" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">CI</span>
          <input
            value={form.ci}
            onChange={updateField("ci")}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none"
            placeholder="06120000184"
            maxLength={11}
            required
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Usuario</span>
          <input
            value={form.username}
            onChange={updateField("username")}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none"
            placeholder="maria.gonzalez25"
            required
          />
        </label>
        <label className="block md:col-span-2">
          <span className="text-sm font-semibold text-slate-700">Nombre</span>
          <input
            value={form.nombre}
            onChange={updateField("nombre")}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none"
            required
          />
        </label>
        <label className="block md:col-span-2">
          <span className="text-sm font-semibold text-slate-700">Apellidos</span>
          <input
            value={form.apellidos}
            onChange={updateField("apellidos")}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none"
            required
          />
        </label>
        <label className="block md:col-span-2">
          <span className="text-sm font-semibold text-slate-700">Correo electrónico</span>
          <input
            type="email"
            value={form.email}
            onChange={updateField("email")}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none"
            required
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Contraseña</span>
          <input
            type="password"
            value={form.password}
            onChange={updateField("password")}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none"
            required
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Repetir contraseña</span>
          <input
            type="password"
            value={form.confirmPassword}
            onChange={updateField("confirmPassword")}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none"
            required
          />
        </label>
        <button type="submit" className="md:col-span-2 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700">
          Crear cuenta
        </button>
      </form>
    </div>
  );
}
