import { useMemo, useState } from "react";
import { API_BASE } from "../../api/httpClient";
import { Input, Select } from "../../components";
import styles from "./ApiPage.module.css";

const API_PREFIX = "/api/v1";

const item = (method, path, description, access = "JWT requerido") => ({
  method,
  path: `${API_PREFIX}${path}`,
  description,
  access,
});

const groups = [
  {
    name: "Autenticación",
    description: "Rutas de acceso público del flujo de cuenta y operaciones sobre la sesión propia.",
    endpoints: [
      item("POST", "/authentication/login/", "Inicia sesión con username y password; establece cookies JWT HttpOnly.", "Público"),
      item("POST", "/authentication/token/refresh/", "Renueva la cookie de acceso usando la cookie refresh.", "Cookie refresh"),
      item("POST", "/authentication/register/", "Registra un estudiante durante la etapa 1 y envía verificación.", "Público; sujeto a etapa"),
      item("POST", "/authentication/verify-email/", "Verifica una cuenta con username y código recibido.", "Público"),
      item("POST", "/authentication/change-pending-email/", "Actualiza el correo de una cuenta pendiente de verificación.", "Público"),
      item("POST", "/authentication/logout/", "Cierra la sesión y revoca el refresh token de la cookie.", "Sesión propia"),
      item("GET", "/authentication/me/", "Retorna los datos de la cuenta autenticada.", "Sesión propia"),
      item("POST", "/authentication/change-password/", "Cambia la contraseña de la cuenta autenticada.", "Sesión propia"),
      item("GET", "/authentication/csrf/", "Establece la cookie CSRF para clientes web.", "Público"),
    ],
  },
  {
    name: "Consultas públicas",
    description: "Información institucional no personal publicada para la landing y consultas generales.",
    endpoints: [
      item("GET", "/gestion-provincial/etapas/disponibilidad/", "Consulta el estado público de las etapas y si el registro está abierto.", "Público"),
      item("GET", "/gestion-provincial/plan-plazas/landing/", "Consulta el plan de plazas publicado.", "Público"),
      item("GET", "/gestion-provincial/carreras/landing/", "Consulta información pública de carreras.", "Público"),
      item("GET", "/gestion-provincial/noticias/landing/", "Lista noticias vigentes de la provincia de la landing.", "Público"),
      item("GET", "/gestion-provincial/noticias/{id}/descargar/", "Descarga el archivo de una noticia pública vigente.", "Público"),
      item("GET", "/import-export/resultados/landing/", "Consulta resultados por estudiante. Filtros: año, provincia, municipio, escuela y asignatura.", "Público"),
      item("GET", "/import-export/otorgamiento/landing/", "Consulta otorgamientos por estudiante. Filtros: año, provincia y CI.", "Público"),
      item("GET", "/import-export/cortes/landing/", "Consulta índices de corte agregados por carrera.", "Público"),
      item("GET", "/import-export/landing/export/{kind}/", "Descarga Excel de resultados, otorgamientos o índices de corte; admite filtros de año y provincia.", "Público"),
    ],
  },
  {
    name: "Gestión de la comisión",
    description: "Operaciones protegidas por permisos del backend; conocer una ruta no concede acceso.",
    endpoints: [
      item("GET", "/gestion-provincial/dashboard/", "Consulta indicadores agregados de la provincia.", "JWT: jefe de comisión, ingreso provincial o superadmin"),
      item("GET", "/gestion-provincial/etapas/", "Consulta el estado y fechas de las etapas.", "JWT: jefe, director/secretario, estudiante o superadmin"),
      item("POST", "/gestion-provincial/etapas/{id}/activar/", "Activa una etapa con sus fechas.", "JWT: jefe de comisión o superadmin"),
      item("POST", "/gestion-provincial/etapas/{id}/cerrar/", "Cierra una etapa en curso.", "JWT: jefe de comisión o superadmin"),
      item("POST", "/gestion-provincial/etapas/reiniciar/", "Reinicia el ciclo cuando todas las etapas están completadas.", "JWT: jefe de comisión o superadmin"),
      item("GET, POST", "/gestion-provincial/plan-plazas/", "Consulta o crea plazas para la provincia autorizada.", "JWT: jefe de comisión o superadmin"),
      item("GET, PATCH, DELETE", "/gestion-provincial/plan-plazas/{id}/", "Consulta, actualiza o elimina una plaza autorizada.", "JWT: jefe de comisión o superadmin"),
      item("GET, POST", "/gestion-provincial/carreras/", "Consulta o gestiona el catálogo de carreras.", "JWT: jefe de comisión, ingreso provincial o superadmin"),
      item("GET, PATCH, DELETE", "/gestion-provincial/carreras/{id}/", "Consulta, actualiza o elimina una carrera.", "JWT: jefe de comisión, ingreso provincial o superadmin"),
      item("GET, POST", "/gestion-provincial/noticias/", "Lista o publica noticias provinciales.", "JWT: jefe de comisión o gestor de noticias"),
      item("GET, PATCH, DELETE", "/gestion-provincial/noticias/{id}/", "Consulta, actualiza o elimina una noticia provincial.", "JWT: jefe de comisión o gestor de noticias"),
    ],
  },
];

const methodStyles = {
  GET: "methodGet",
  POST: "methodPost",
  PATCH: "methodPatch",
  PUT: "methodPut",
  DELETE: "methodDelete",
};

function EndpointRow({ entry }) {
  return (
    <article className={styles.endpointRow}>
      <div className={styles.endpointTop}>
        <div className={styles.methodList}>
          {entry.method.split(", ").map((method) => <span key={method} className={styles[methodStyles[method]] || styles.methodDefault}>{method}</span>)}
        </div>
        <code className={styles.endpointPath}>{entry.path}</code>
        <span className={styles.endpointAccess}>{entry.access}</span>
      </div>
      <p className={styles.endpointDescription}>{entry.description}</p>
    </article>
  );
}

export default function ApiPage() {
  const [query, setQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("Todos");
  const normalizedQuery = query.trim().toLowerCase();
  const visibleGroups = useMemo(() => groups
    .filter((group) => selectedGroup === "Todos" || group.name === selectedGroup)
    .map((group) => ({
      ...group,
      endpoints: group.endpoints.filter((entry) => !normalizedQuery || `${entry.method} ${entry.path} ${entry.description}`.toLowerCase().includes(normalizedQuery)),
    }))
    .filter((group) => group.endpoints.length), [normalizedQuery, selectedGroup]);
  const endpointCount = groups.reduce((total, group) => total + group.endpoints.length, 0);
  const apiOrigin = import.meta.env.VITE_API_ORIGIN || window.location.origin;
  const apiDocsUrl = new URL(
    `${API_BASE.replace(/\/+$/, "")}/docs/`,
    `${apiOrigin.replace(/\/+$/, "")}/`,
  ).href;

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroTop}>
            <div>
              <h1 className={styles.title}>Interoperabilidad institucional</h1>
              <p className={styles.description}>
                {" "}Consulta la <a href={apiDocsUrl} target="_blank" rel="noopener noreferrer">documentación interactiva de la API (Swagger UI)</a>.
              </p>
            </div>
            <div className={styles.countBox}>
              <p className={styles.countValue}>{endpointCount}</p>
              <p className={styles.countLabel}>rutas seleccionadas</p>
            </div>
          </div>
        </div>
        <div className={styles.filterBar}>
          <div className={styles.filterRow}>
            <label className={styles.searchField}>
              <span className={styles.srOnly}>Buscar endpoint</span>
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por ruta, método o descripción..." />
            </label>
            <Select className={styles.groupFilter} value={selectedGroup} onChange={(event) => setSelectedGroup(event.target.value)}>
              <option>Todos</option>
              {groups.map((group) => <option key={group.name}>{group.name}</option>)}
            </Select>
          </div>
          <p className={styles.authNote}>La sesion se autentica mediante cookies JWT HttpOnly. Las rutas protegidas validan rol y alcance en el backend; las operaciones de escritura tambien requieren CSRF.</p>
        </div>
      </section>
      <div className={styles.groupsList}>
        {visibleGroups.map((group) => (
          <section key={group.name} className={styles.groupCard}>
            <div className={styles.groupHeader}>
              <div><h2 className={styles.groupTitle}>{group.name}</h2><p className={styles.groupDescription}>{group.description}</p></div>
              <span className={styles.groupBadge}>{group.endpoints.length} rutas</span>
            </div>
            <div>{group.endpoints.map((entry) => <EndpointRow key={`${entry.method}-${entry.path}`} entry={entry} />)}</div>
          </section>
        ))}
        {!visibleGroups.length && <section className={styles.emptyState}>No hay endpoints que coincidan con la búsqueda.</section>}
      </div>
    </div>
  );
}
