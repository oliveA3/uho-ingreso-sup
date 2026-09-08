import { Link } from "react-router-dom";
import AuthActions from "./AuthActions";

export default function LandingNav({ user, visualConfig, onLogout }) {
  return (
    <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-6 sm:py-5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link to="/" style={{ color: "var(--brand-primary)" }} className="flex min-w-0 items-center gap-2 truncate text-base font-black tracking-tight sm:text-lg">
            {visualConfig?.logo_url ? <img src={visualConfig.logo_url} alt="Logo" className="h-8 w-8 object-contain" /> : "🎓"}
            <span className="truncate">{visualConfig?.nombre_sistema || "IngresoSUP"}</span>
          </Link>
          <p className="hidden text-sm text-slate-500 sm:block">
            Sistema de Ingreso a la Educación Superior
          </p>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <a href="#cronograma" className="text-sm font-medium text-slate-600 transition hover:text-sky-700">
            Cronograma
          </a>
          <a href="#noticias" className="text-sm font-medium text-slate-600 transition hover:text-sky-700">
            Noticias
          </a>
          <a href="#cortes" className="text-sm font-medium text-slate-600 transition hover:text-sky-700">
            Índices Corte
          </a>
          <a href="#ofertas" className="text-sm font-medium text-slate-600 transition hover:text-sky-700">
            Universidades
          </a>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          <AuthActions user={user} onLogout={onLogout} />
        </div>
      </div>
    </nav>
  );
}
