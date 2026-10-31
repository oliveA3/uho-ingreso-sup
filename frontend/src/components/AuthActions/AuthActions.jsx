import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchRegistrationAvailability } from "../../api/landing.service";
import PrimaryButton from "../Buttons/PrimaryButton";
import styles from "./AuthActions.module.css";

// `onBothActionsChange` avisa al contenedor de cuándo se muestran a la vez los
// dos botones de sesión (iniciar sesión + registro), para que pueda ajustar el
// resto de la barra en pantallas estrechas.
export default function AuthActions({ user, onLogout, onBothActionsChange }) {
  const [registrationOpen, setRegistrationOpen] = useState(false);

  useEffect(() => {
    if (user) return;
    fetchRegistrationAvailability()
      .then((data) => setRegistrationOpen(data.registro_estudiantil))
      .catch(() => setRegistrationOpen(false));
  }, [user]);

  useEffect(() => {
    onBothActionsChange?.(!user && registrationOpen);
  }, [user, registrationOpen, onBothActionsChange]);

  return (
    <div className={styles.container}>
      {user ? (
        <>
          <span className={styles.userName}>{user.first_name || user.nombre || user.username} {user.last_name || user.apellidos || ""}</span>
          <button
            type="button"
            onClick={onLogout}
            className={styles.logoutButton}
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
              className={styles.registerLink}
            >
              Registro estudiantil
            </Link>
          )}
        </>
      )}
    </div>
  );
}
