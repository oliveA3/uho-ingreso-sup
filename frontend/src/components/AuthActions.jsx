import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchRegistrationAvailability } from "../services/api";
import PrimaryButton from "./Buttons/PrimaryButton";

const allStagesActive = import.meta.env.VITE_ALL_STAGES_ACTIVE === "true";

export default function AuthActions({ user, onLogout }) {
  const [registrationOpen, setRegistrationOpen] = useState(false);

  useEffect(() => {
    if (user) return;
    if (allStagesActive) {
      setRegistrationOpen(true);
      return;
    }
    fetchRegistrationAvailability()
      .then((data) => setRegistrationOpen(data.registro_estudiantil))
      .catch(() => setRegistrationOpen(false));
  }, [user]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {user ? (
        <>
          <span className="text-sm text-slate-700">{user.first_name || user.nombre || user.username} {user.last_name || user.apellidos || ""}</span>
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
          <PrimaryButton as={Link}
            to="/login"
          >
            Iniciar sesión
          </PrimaryButton>
          {registrationOpen && (
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
