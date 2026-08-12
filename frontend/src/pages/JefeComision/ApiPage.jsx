export default function ApiPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700">Documentación API REST</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">API para integración del sistema</h1>
          <p className="mt-3 text-sm text-slate-600">Revisa las rutas disponibles, formatos y ejemplos para consumir la API.</p>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700">
          <p className="font-semibold">URL base</p>
          <p className="mt-2">https://tuservidor/api/</p>
          <p className="mt-4">Consulta documentación actualizada en el backend o en los endpoints de Swagger.</p>
        </div>

        <div className="mt-6 space-y-4">
          {[
            { title: "Autenticación", description: "POST /auth/login, /auth/logout, /auth/me" },
            { title: "Etapas", description: "GET /jefatura/etapas, POST /jefatura/etapas/activar" },
            { title: "Escalafones", description: "GET /escalafones, POST /escalafones/importar" },
          ].map((item) => (
            <div key={item.title} className="rounded-3xl border border-slate-200 bg-white p-5">
              <p className="font-semibold text-slate-900">{item.title}</p>
              <p className="mt-2 text-sm text-slate-600">{item.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
