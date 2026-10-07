import { Link } from "react-router-dom";
import { Card } from "../components";
import styles from "./PolicyPrivacyPage.module.css";

export default function PolicyPrivacyPage() {
  return (
    <div className={styles.page}>
      <Card as="section" padding="p-6" className={styles.card}>
        <div className={styles.headerRow}>
          <h1 className={styles.title}>Política de privacidad</h1>
          <Link to="/registro" className={styles.backLink}>
            ← Volver al registro
          </Link>
        </div>

        <p className={styles.intro}>
          IngresoSUP recopila y procesa los datos necesarios para gestionar la inscripción, identificación,
          comunicación y seguimiento del proceso de ingreso universitario.
        </p>

        <div className={styles.sections}>
          <p><strong>Datos que se tratan:</strong> nombre completo, carnet de identidad, correo electrónico, teléfonos, provincia, municipio, escuela, datos del proceso de ingreso y, cuando proceda, datos de contacto del tutor.</p>
          <p><strong>Finalidad:</strong> administrar el proceso de ingreso, contactar al estudiante, verificar su identidad, validar la información académica y cumplir con la normativa institucional.</p>
          <p><strong>Conservación:</strong> la información se conserva durante el tiempo que sea necesario para la gestión del proceso y la normativa vigente.</p>
          <p><strong>Protección:</strong> se aplican medidas razonables para proteger la información y limitar su acceso a personal autorizado.</p>
          <p><strong>Derechos:</strong> el estudiante puede solicitar acceso, corrección, actualización o eliminación de sus datos en los términos de la normativa vigente.</p>
        </div>
      </Card>
    </div>
  );
}
