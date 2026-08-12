const colors = [
  { color: "#1F4E79", label: "Primario" },
  { color: "#2E75B6", label: "Secundario" },
  { color: "#5BA3D9", label: "Acento" },
  { color: "#D6E4F0", label: "Fondo", border: true },
  { color: "#1A7A4A", label: "Éxito" },
  { color: "#C0392B", label: "Error" },
];

export default function IdentidadPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">🎨 Identidad Visual</h1>
          <p className="mt-2 text-sm text-slate-600">Ajustada al manual de identidad del contexto MINED/MES.</p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {colors.map((swatch) => (
            <div key={swatch.label} className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-center">
              <div className={`mx-auto h-20 w-20 rounded-3xl ${swatch.border ? "border border-slate-300" : ""}`} style={{ background: swatch.color }} />
              <p className="text-sm font-semibold text-slate-900">{swatch.label}</p>
              <p className="text-xs text-slate-600">{swatch.color}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <label className="space-y-2 text-sm text-slate-700">
            Logo del Sistema (PNG/SVG)
            <input type="file" accept="image/*" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900" />
          </label>
          <label className="space-y-2 text-sm text-slate-700">
            Nombre del Sistema
            <input value="IngresoSUP" readOnly className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900" />
          </label>
          <label className="space-y-2 text-sm text-slate-700">
            Tipografía Principal
            <select className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">
              <option>Segoe UI (recomendada)</option>
              <option>Arial</option>
              <option>Roboto</option>
            </select>
          </label>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700">
          📋 El logo aparece en: cabecera Landing Page, pantalla de login y en todos los documentos exportados (boletas PDF, reportes, listados).
        </div>

        <button className="mt-4 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
          💾 Guardar Configuración
        </button>
      </section>
    </div>
  );
}
