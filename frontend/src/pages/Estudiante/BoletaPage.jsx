export default function BoletaPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">📝 Boleta de Solicitud</h1>
            <p className="mt-2 text-sm text-slate-600">Revisa y descarga tu boleta oficial de solicitud de ingreso.</p>
          </div>
          <button className="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700">
            Descargar boleta
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {[
            { label: "Nombre", value: "María Pérez" },
            { label: "Provincia", value: "Santiago de Cuba" },
            { label: "Escuela", value: "Preuniversitario José Martí" },
            { label: "Carrera", value: "Matemáticas" },
          ].map((item) => (
            <div key={item.label} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700">
          Asegúrate de que todos los datos estén correctos antes de descargar. La boleta oficial será utilizada en el proceso de selección.
        </div>
      </section>
    </div>
  );
}
