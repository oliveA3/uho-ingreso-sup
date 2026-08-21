import { useEffect, useState } from "react";
import { fetchSuperAdminConfig, updateSuperAdminConfig } from "../../services/api";

const colorFields = [
  ["color_primario", "Primario"],
  ["color_secundario", "Secundario"],
  ["color_acento", "Acento"],
  ["color_fondo", "Fondo"],
  ["color_exito", "Éxito"],
  ["color_error", "Error"],
];

const defaultConfig = {
  logo_url: "",
  nombre_sistema: "IngresoSUP",
  tipografia: "Segoe UI",
  color_primario: "#1F4E79",
  color_secundario: "#2E75B6",
  color_acento: "#5BA3D9",
  color_fondo: "#D6E4F0",
  color_exito: "#1A7A4A",
  color_error: "#C0392B",
};

export default function IdentidadPage() {
  const [config, setConfig] = useState(defaultConfig);
  const [logoFile, setLogoFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSuperAdminConfig()
      .then((data) => setConfig({ ...defaultConfig, ...data.config }))
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  function updateField(field, value) {
    setConfig((current) => ({ ...current, [field]: value }));
    setMessage("");
  }

  function restoreDefaults() {
    setConfig({ ...defaultConfig });
    setLogoFile(null);
    setError("");
    setMessage("Valores predeterminados restaurados. Guarda la configuración para aplicarlos.");
  }

  function handleLogoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Selecciona un archivo de imagen válido.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("El logo no puede superar los 2 MB.");
      return;
    }
    setError("");
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => updateField("logo_url", reader.result);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const payload = Object.fromEntries(
        Object.keys(defaultConfig).map((field) => [field, config[field]])
      );
      const data = await updateSuperAdminConfig(payload);
      setConfig({ ...defaultConfig, ...data.config });
      setLogoFile(null);
      window.dispatchEvent(new CustomEvent("visual-identity-updated", { detail: data.config }));
      setMessage("Configuración guardada correctamente.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">🎨 Identidad Visual</h1>
          <p className="mt-2 text-sm text-slate-600">Configura la apariencia global de IngresoSUP.</p>
        </div>

        {error && <p className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
        {message && <p className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700">{message}</p>}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {colorFields.map(([field, label]) => (
            <label key={field} className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-center text-sm font-semibold text-slate-900">
              <span className="block">{label}</span>
              <input type="color" value={config[field]} onChange={(event) => updateField(field, event.target.value.toUpperCase())} className="mx-auto h-20 w-20 cursor-pointer rounded-3xl border-0 bg-transparent p-0" />
              <input type="text" pattern="^#[0-9A-Fa-f]{6}$" value={config[field]} onChange={(event) => updateField(field, event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-center text-xs font-normal text-slate-700" aria-label={`Código de color ${label}`} />
            </label>
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <label className="space-y-2 text-sm text-slate-700">Logo del Sistema (PNG/SVG)
            <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={handleLogoChange} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900" />
            {logoFile && <span className="block text-xs text-slate-500">{logoFile.name}</span>}
            {config.logo_url && <img src={config.logo_url} alt="Vista previa del logo" className="mt-3 h-16 max-w-48 object-contain" />}
          </label>
          <label className="space-y-2 text-sm text-slate-700">Nombre del Sistema
            <input value={config.nombre_sistema} onChange={(event) => updateField("nombre_sistema", event.target.value)} required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900" />
          </label>
          <label className="space-y-2 text-sm text-slate-700">Tipografía Principal
            <select value={config.tipografia} onChange={(event) => updateField("tipografia", event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">
              <option>Segoe UI</option>
              <option>Arial</option>
              <option>Roboto</option>
              <option>Georgia</option>
              <option>Verdana</option>
            </select>
          </label>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700">
          Los cambios se guardan en el backend y se aplican a la interfaz global.
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button disabled={loading || saving} type="submit" className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? "Guardando..." : "💾 Guardar Configuración"}
          </button>
          <button disabled={loading || saving} type="button" onClick={restoreDefaults} className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
            Volver a predeterminado
          </button>
        </div>
      </form>
    </div>
  );
}
