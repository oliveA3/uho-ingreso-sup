import { Link } from "react-router-dom";
import AuthActions from "./AuthActions";

export default function LandingNav({ user, visualConfig, onLogout, onOpenMenu }) {
  return (
    <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-5 sm:px-6">
        {/* Logo y título */}
        <div className="flex items-center gap-3">
          <Link to="/" style={{ color: "var(--brand-primary)" }} className="flex items-center gap-2 text-lg font-black tracking-tight">
            {visualConfig?.logo_url ? <img src={visualConfig.logo_url} alt="Logo" className="h-8 w-8 object-contain" /> : "🎓"}
            {visualConfig?.nombre_sistema || "IngresoSUP"}
          </Link>
          <p className="text-sm text-slate-500">
            Sistema de Ingreso a la Educación Superior
          </p>
        </div>

        {/* Links de navegación */}
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

        <div className="flex items-center gap-3">
          {user && (
            <button
              type="button"
              onClick={onOpenMenu}
              className="rounded-full p-2 text-slate-600 hover:bg-slate-100 hover:text-sky-700"
              aria-label="Abrir menú"
            >
              ☰
            </button>
          )}
          <AuthActions user={user} onLogout={onLogout} />
        </div>
      </div>
    </nav>
  );
}
