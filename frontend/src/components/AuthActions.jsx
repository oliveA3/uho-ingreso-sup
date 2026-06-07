import { Link } from "react-router-dom";

const isStageOne = true;

export default function AuthActions({ user, onLogout }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {user ? (
        <>
          <span className="text-sm text-slate-700">{user.nombre} {user.apellidos}</span>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-300"
          >
            Cerrar sesión
          </button>
        </>
      ) : (
        <>
          <Link
            to="/login"
            className="rounded-full bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
          >
            Iniciar sesión
          </Link>
          {isStageOne && (
            <Link
              to="/registro"
              className="rounded-full border border-sky-600 bg-white px-5 py-2.5 text-sm font-semibold text-sky-700 transition hover:bg-sky-50"
            >
              Registro estudiantil
            </Link>
          )}
        </>
      )}
    </div>
  );
}
