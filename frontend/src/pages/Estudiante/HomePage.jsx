import { Link } from "react-router-dom";

export default function EstudianteHomePage({ user }) {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">Estudiante</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Bienvenido al Panel del Estudiante</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-600">Consulta tu boleta de solicitud, revisa tus resultados y mantente al día con el proceso.</p>
          </div>
          <div className="rounded-3xl bg-slate-50 px-5 py-4 text-sm text-slate-700">
            <p className="font-semibold">Usuario</p>
            <p>{user?.first_name || user?.nombre || user?.username} {user?.last_name || user?.apellidos || ""}</p>
            <p className="text-slate-500">{user?.rol_label || user?.rol}</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <Link to="boleta" className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center transition hover:bg-slate-100">
            <div className="text-3xl">📝</div>
            <p className="mt-4 text-lg font-semibold text-slate-900">Boleta de Solicitud</p>
            <p className="mt-2 text-sm text-slate-600">Completa y revisa tu solicitud de ingreso.</p>
          </Link>
          <Link to="resultados" className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center transition hover:bg-slate-100">
            <div className="text-3xl">📊</div>
            <p className="mt-4 text-lg font-semibold text-slate-900">Resultados</p>
            <p className="mt-2 text-sm text-slate-600">Revisa los resultados del proceso y tu puntaje.</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
