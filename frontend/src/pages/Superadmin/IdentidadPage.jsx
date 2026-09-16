import { useEffect, useState } from "react";
import { fetchSuperAdminConfig, updateSuperAdminConfig } from "../../services/api";
import { useTheme } from "../../theme/ThemeContext";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import PrimaryButton from "../../components/Buttons/PrimaryButton";
import SecondaryButton from "../../components/Buttons/SecondaryButton";
import { Card, FormField, Input, PageHeader, Select } from "../../components";
import styles from "./IdentidadPage.module.css";

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
  const { refreshTheme } = useTheme();
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
      await refreshTheme();
      setMessage("Configuración guardada correctamente.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card as="form" padding="p-8" onSubmit={handleSubmit}>
        <PageHeader title="🎨 Identidad Visual" subtitle="Configura la apariencia global de IngresoSUP." />

        {error && <FeedbackMessage type="error" className="mt-5 rounded-2xl">{error}</FeedbackMessage>}
        {message && <FeedbackMessage type="success" className="mt-5 rounded-2xl">{message}</FeedbackMessage>}

        <div className={styles.colorGrid}>
          {colorFields.map(([field, label]) => (
            <label key={field} className={styles.colorSwatch}>
              <span className={styles.colorLabel}>{label}</span>
              <input type="color" value={config[field]} onChange={(event) => updateField(field, event.target.value.toUpperCase())} className={styles.colorPicker} />
              <input type="text" pattern="^#[0-9A-Fa-f]{6}$" value={config[field]} onChange={(event) => updateField(field, event.target.value)} className={styles.colorHex} aria-label={`Código de color ${label}`} />
            </label>
          ))}
        </div>

        <div className={styles.fieldsGrid}>
          <FormField label="Logo del Sistema (PNG/SVG)">
            <Input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={handleLogoChange} />
            {logoFile && <span className={styles.logoFileName}>{logoFile.name}</span>}
            {config.logo_url && <img src={config.logo_url} alt="Vista previa del logo" className={styles.logoPreview} />}
          </FormField>
          <FormField label="Nombre del Sistema">
            <Input value={config.nombre_sistema} onChange={(event) => updateField("nombre_sistema", event.target.value)} required />
          </FormField>
          <FormField label="Tipografía Principal">
            <Select value={config.tipografia} onChange={(event) => updateField("tipografia", event.target.value)}>
              <option>Segoe UI</option>
              <option>Arial</option>
              <option>Roboto</option>
              <option>Georgia</option>
              <option>Verdana</option>
            </Select>
          </FormField>
        </div>

        <div className={styles.formActions}>
          <SecondaryButton disabled={loading || saving} onClick={restoreDefaults}>
            Volver a predeterminado
          </SecondaryButton>
          <PrimaryButton disabled={loading || saving} type="submit">
            {saving ? "Guardando..." : "💾 Guardar Configuración"}
          </PrimaryButton>
        </div>
      </Card>
    </div>
  );
}
