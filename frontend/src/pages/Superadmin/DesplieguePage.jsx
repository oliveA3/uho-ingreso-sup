import { Card, DataTable, PageHeader } from "../../components";
import styles from "./DesplieguePage.module.css";

const dockerServices = [
  ["app", "php:8.3-fpm / node:20", "8000", "Servidor de aplicación principal"],
  ["db", "postgres:16-alpine", "5432", "Base de datos PostgreSQL"],
  ["redis", "redis:7-alpine", "6379", "Caché y cola de notificaciones"],
  ["worker", "(misma app)", "—", "Procesador de colas (emails masivos)"],
  ["mailhog", "mailhog/mailhog", "8025", "SMTP local para desarrollo"],
];

const columns = [
  { key: "servicio", header: "Servicio", className: "font-semibold text-slate-900", render: ([service]) => service },
  { key: "imagen", header: "Imagen", render: ([, image]) => image },
  { key: "puerto", header: "Puerto", render: ([, , port]) => port },
  { key: "funcion", header: "Función", render: ([, , , purpose]) => purpose },
];

export default function DesplieguePage() {
  return (
    <div className="space-y-6">
      <Card padding="p-8">
        <PageHeader
          title="🐳 Despliegue Docker"
          subtitle="Entorno de desarrollo local reproducible y servicios del sistema."
          actions={
            <div className={styles.referenceBox}>
              <p className={styles.referenceLabel}>Referencia</p>
              <p>docker-compose.yml</p>
            </div>
          }
        />

        <div className={styles.terminal}>
          <div className={`${styles.step} ${styles.comment}`}># 1. Clonar repositorio</div>
          <div className={styles.command}>git clone https://github.com/usuario/ingresoSUP.git && cd ingresoSUP</div>
          <div className={`${styles.step} ${styles.comment}`}># 2. Configurar variables de entorno</div>
          <div className={styles.command}>cp .env.example .env</div>
          <div className={`${styles.step} ${styles.comment}`}># 3. Levantar todos los servicios</div>
          <div className={styles.command}>docker-compose up -d</div>
          <div className={`${styles.successGroup} ${styles.success}`}>✅ App en http://localhost:8000</div>
          <div className={styles.success}>✅ API Docs en http://localhost:8000/api/docs</div>
          <div className={styles.success}>✅ Correo (dev) en http://localhost:8025 (MailHog)</div>
        </div>

        <DataTable className="table-scroll mt-6" columns={columns} data={dockerServices} getRowKey={([service]) => service} />
      </Card>
    </div>
  );
}
