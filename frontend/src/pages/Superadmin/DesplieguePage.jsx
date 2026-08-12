const dockerServices = [
  ["app", "php:8.3-fpm / node:20", "8000", "Servidor de aplicación principal"],
  ["db", "postgres:16-alpine", "5432", "Base de datos PostgreSQL"],
  ["redis", "redis:7-alpine", "6379", "Caché y cola de notificaciones"],
  ["worker", "(misma app)", "—", "Procesador de colas (emails masivos)"],
  ["mailhog", "mailhog/mailhog", "8025", "SMTP local para desarrollo"],
];

export default function DesplieguePage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">🐳 Despliegue Docker</h1>
            <p className="mt-2 text-sm text-slate-600">Entorno de desarrollo local reproducible y servicios del sistema.</p>
          </div>
          <div className="rounded-3xl bg-slate-50 px-5 py-4 text-sm text-slate-700">
            <p className="font-semibold">Referencia</p>
            <p>docker-compose.yml</p>
          </div>
        </div>

        <div className="mt-6 rounded-3xl bg-slate-950 p-6 text-sm text-slate-200 font-mono">
          <div className="text-slate-400 mb-4"># 1. Clonar repositorio</div>
          <div className="text-slate-100">git clone https://github.com/usuario/ingresoSUP.git && cd ingresoSUP</div>
          <div className="mt-4 text-slate-400"># 2. Configurar variables de entorno</div>
          <div className="text-slate-100">cp .env.example .env</div>
          <div className="mt-4 text-slate-400"># 3. Levantar todos los servicios</div>
          <div className="text-slate-100">docker-compose up -d</div>
          <div className="mt-5 text-emerald-400">✅ App en http://localhost:8000</div>
          <div className="text-emerald-400">✅ API Docs en http://localhost:8000/api/docs</div>
          <div className="text-emerald-400">✅ Correo (dev) en http://localhost:8025 (MailHog)</div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 text-left text-slate-700">
                <th className="border-b border-slate-200 px-4 py-3">Servicio</th>
                <th className="border-b border-slate-200 px-4 py-3">Imagen</th>
                <th className="border-b border-slate-200 px-4 py-3">Puerto</th>
                <th className="border-b border-slate-200 px-4 py-3">Función</th>
              </tr>
            </thead>
            <tbody>
              {dockerServices.map(([service, image, port, purpose]) => (
                <tr key={service} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{service}</td>
                  <td className="px-4 py-3 text-slate-700">{image}</td>
                  <td className="px-4 py-3 text-slate-700">{port}</td>
                  <td className="px-4 py-3 text-slate-700">{purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
