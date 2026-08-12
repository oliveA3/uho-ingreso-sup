const nomencladores = [
  { emoji: "🗺️", title: "Provincias", subtitle: "15 registros" },
  { emoji: "🏘️", title: "Municipios", subtitle: "168 registros" },
  { emoji: "🏫", title: "Escuelas", subtitle: "87 registros" },
  { emoji: "🎓", title: "Carreras", subtitle: "120 registros" },
  { emoji: "🏛️", title: "CES / Univ.", subtitle: "8 registros" },
  { emoji: "📐", title: "Asignaturas", subtitle: "3 registros" },
];

export default function NomencladoresPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">📚 Nomencladores</h1>
            <p className="mt-2 text-sm text-slate-600">Todos los catálogos del sistema con CRUD completo.</p>
          </div>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
          >
            Ver catálogo
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {nomencladores.map((item) => (
            <div key={item.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center">
              <div className="text-3xl">{item.emoji}</div>
              <div className="mt-4 text-sm font-semibold text-slate-900">{item.title}</div>
              <div className="mt-2 text-sm text-slate-600">{item.subtitle}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700">
          ℹ️ Los nomencladores con registros asociados se desactivan (soft delete) para preservar integridad histórica.
        </div>
      </section>
    </div>
  );
}
