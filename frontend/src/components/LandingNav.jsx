import { Link } from "react-router-dom";
import AuthActions from "./AuthActions";

export default function LandingNav({ user, onLogout }) {
  return (
    <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex  items-center gap-3">
          <div className="flex items-center gap-3">
            <span className="text-lg font-black tracking-tight text-sky-700">🎓 IngresoSUP</span>
            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
                Landing Page
            </span>
          </div>
          <p className="text-sm text-slate-500">Sistema de Ingreso a la Educación Superior</p>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <a href="#noticias" className="text-sm font-medium text-slate-600 transition hover:text-sky-700">
            Noticias
          </a>
          <a href="#plazas" className="text-sm font-medium text-slate-600 transition hover:text-sky-700">
            Plan de Plazas
          </a>
          <a href="#cortes" className="text-sm font-medium text-slate-600 transition hover:text-sky-700">
            Índices Corte
          </a>
          <a href="#ofertas" className="text-sm font-medium text-slate-600 transition hover:text-sky-700">
            Carreras
          </a>
        </div>

        <AuthActions user={user} onLogout={onLogout} />
      </div>
    </nav>
  );
}
