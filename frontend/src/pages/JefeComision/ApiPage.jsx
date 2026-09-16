import { useMemo, useState } from "react";
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
    description: "Registro, verificación, sesión y tokens JWT.",
    endpoints: [
      item("POST", "/authentication/login/", "Login. Body: username, password. Retorna access, refresh y usuario.", "Público"),
      item("POST", "/authentication/token/refresh/", "Renueva el access token con un refresh token válido.", "Refresh token"),
      item("POST", "/authentication/register/", "Registra un estudiante y envía código de verificación.", "Público"),
      item("POST", "/authentication/verify-email/", "Verifica una cuenta con el código recibido.", "Público"),
      item("POST", "/authentication/change-pending-email/", "Cambia el correo de una cuenta no verificada.", "Público"),
      item("POST", "/authentication/logout/", "Revoca el refresh token enviado.", "JWT requerido"),
      item("GET", "/authentication/me/", "Retorna el usuario autenticado.", "JWT requerido"),
      item("GET", "/authentication/csrf/", "Establece la cookie CSRF para clientes web.", "Público"),
    ],
  },
  {
    name: "Core, auditoría y notificaciones",
    description: "Salud del servicio, trazabilidad y mensajes del usuario.",
    endpoints: [
      item("GET", "/health/", "Comprueba disponibilidad del backend."),
      item("GET", "/logs/", "Lista logs. Filtros: usuario, acción, módulo, fecha_desde, fecha_hasta."),
      item("GET", "/logs/export/", "Exporta logs de auditoría."),
      item("GET", "/logs/export/pdf/", "Genera PDF de logs filtrados."),
      item("GET", "/notificaciones/", "Lista notificaciones del usuario."),
      item("POST", "/notificaciones/{id}/leer/", "Marca una notificación como leída."),
    ],
  },
  {
    name: "Superadministración y nomencladores",
    description: "CRUD real de catálogos institucionales y usuarios globales.",
    endpoints: [
      item("GET, POST", "/superadmin/provincias/", "Lista o crea provincias."),
      item("GET, PUT, PATCH, DELETE", "/superadmin/provincias/{id}/", "Consulta, edita o desactiva una provincia."),
      item("GET, POST", "/superadmin/municipios/", "Lista o crea municipios."),
      item("GET, PUT, PATCH, DELETE", "/superadmin/municipios/{id}/", "Consulta, edita o desactiva un municipio."),
      item("GET, POST", "/superadmin/escuelas/", "Lista o crea escuelas."),
      item("GET, PUT, PATCH, DELETE", "/superadmin/escuelas/{id}/", "Consulta, edita o desactiva una escuela."),
      item("GET, POST", "/superadmin/ces/", "Lista o crea centros de educación superior."),
      item("GET, PUT, PATCH, DELETE", "/superadmin/ces/{id}/", "Consulta, edita o desactiva un CES."),
      item("GET, POST", "/superadmin/carreras/", "Lista o crea carreras."),
      item("GET, PUT, PATCH, DELETE", "/superadmin/carreras/{id}/", "Consulta, edita o desactiva una carrera."),
      item("GET, POST", "/superadmin/asignaturas/", "Lista o crea asignaturas."),
      item("GET, PUT, PATCH, DELETE", "/superadmin/asignaturas/{id}/", "Consulta, edita o desactiva una asignatura."),
      item("GET, POST", "/superadmin/usuarios/", "Lista o crea usuarios administrativos."),
      item("GET, PUT, PATCH, DELETE", "/superadmin/usuarios/{id}/", "Consulta, edita o desactiva un usuario."),
      item("GET", "/superadmin/dashboard/", "Indicadores globales del sistema."),
      item("GET, PATCH", "/superadmin/config/", "Consulta o actualiza identidad visual."),
    ],
  },
  {
    name: "Gestión provincial y proceso",
    description: "Etapas, procesos, plan de plazas y alcance provincial.",
    endpoints: [
      item("GET", "/gestion-provincial/dashboard/", "Indicadores provinciales."),
      item("GET", "/gestion-provincial/municipios/", "Lista municipios de la provincia."),
      item("GET", "/gestion-provincial/provincias/", "Lista provincias disponibles."),
      item("GET, POST", "/gestion-provincial/escuelas/", "Lista o crea escuelas provinciales."),
      item("GET, PATCH, DELETE", "/gestion-provincial/escuelas/{id}/", "Consulta, edita o desactiva escuela."),
      item("GET, POST", "/gestion-provincial/usuarios/", "Lista o crea usuarios provinciales."),
      item("GET, PATCH, DELETE", "/gestion-provincial/usuarios/{id}/", "Consulta, edita o desactiva usuario."),
      item("GET, POST", "/gestion-provincial/carreras/", "Lista o crea carreras provinciales."),
      item("GET, PATCH, DELETE", "/gestion-provincial/carreras/{id}/", "Consulta, edita o desactiva carrera."),
      item("GET", "/gestion-provincial/ces/", "Lista CES provinciales."),
      item("GET", "/gestion-provincial/etapas/", "Lista etapas del proceso."),
      item("GET", "/gestion-provincial/etapas/disponibilidad/", "Disponibilidad de etapas para la landing.", "Consulta pública configurada"),
      item("GET", "/gestion-provincial/plan-plazas/landing/", "Plan de plazas de la landing.", "Consulta pública configurada"),
      item("GET, POST", "/gestion-provincial/procesos/", "Lista o crea procesos de ingreso."),
      item("POST", "/gestion-provincial/etapas/{id}/activar/", "Activa una etapa."),
      item("POST", "/gestion-provincial/etapas/{id}/cerrar/", "Cierra una etapa."),
      item("POST", "/gestion-provincial/etapas/reiniciar/", "Reinicia las etapas."),
      item("GET, POST", "/gestion-provincial/plan-plazas/", "Lista o crea plazas."),
      item("GET, PATCH, DELETE", "/gestion-provincial/plan-plazas/{id}/", "Consulta, edita o elimina plaza."),
      item("GET, POST", "/gestion-provincial/boletas-solicitud/modificaciones/", "Lista o procesa modificaciones."),
      item("POST", "/gestion-provincial/boletas-solicitud/{id}/autorizar-modificacion/", "Autoriza modificación de boleta."),
    ],
  },
  {
    name: "Gestión municipal y escuela",
    description: "Operaciones territoriales, métricas escolares y aprobación de boletas.",
    endpoints: [
      item("GET, POST", "/gestion-municipal/escuelas/", "Lista o crea escuelas municipales."),
      item("GET, PATCH, DELETE", "/gestion-municipal/escuelas/{id}/", "Consulta, edita o desactiva escuela."),
      item("GET, POST", "/gestion-municipal/usuarios/", "Lista o crea usuarios municipales."),
      item("GET, PATCH, DELETE", "/gestion-municipal/usuarios/{id}/", "Consulta, edita o desactiva usuario."),
      item("GET", "/gestion-escuela/estudiantes/sin-cuenta/", "Lista estudiantes sin cuenta."),
      item("GET", "/gestion-escuela/dashboard/", "Indicadores de la escuela."),
      item("GET", "/gestion-escuela/boleta-interes/metricas/", "Métricas de boletas de interés."),
      item("GET", "/gestion-escuela/confirmacion-pruebas/metricas/", "Métricas de confirmación de pruebas."),
      item("GET", "/gestion-escuela/boletas-solicitud/", "Lista boletas de solicitud."),
      item("POST", "/gestion-escuela/boletas-solicitud/{id}/aprobar/", "Aprueba una boleta de solicitud."),
    ],
  },
  {
    name: "Estudiante, escalafón y boletas",
    description: "Dashboard, perfil y flujo de preferencias del estudiante.",
    endpoints: [
      item("GET", "/gestion-personal/estudiante/dashboard/", "Estado general del proceso."),
      item("GET, PATCH", "/gestion-personal/estudiante/perfil/", "Consulta o actualiza el perfil."),
      item("GET", "/gestion-personal/estudiante/boleta-interes/", "Consulta la boleta de interés."),
      item("POST", "/gestion-personal/estudiante/boleta-interes/items/", "Añade una carrera a preferencias."),
      item("PATCH, DELETE", "/gestion-personal/estudiante/boleta-interes/items/{id}/", "Edita o elimina preferencia."),
      item("POST", "/gestion-personal/estudiante/boleta-interes/enviar/", "Envía la boleta de interés."),
      item("POST", "/gestion-personal/estudiante/boleta-interes/editar/", "Edita la boleta durante la etapa habilitada."),
      item("GET", "/gestion-personal/estudiante/boleta-solicitud/", "Consulta la boleta definitiva."),
      item("POST", "/gestion-personal/estudiante/boleta-solicitud/editar/", "Guarda una edición de la boleta."),
      item("GET", "/gestion-personal/estudiante/boleta-solicitud/pdf/", "Genera el PDF de la boleta."),
      item("GET, POST", "/gestion-personal/estudiante/confirmacion-pruebas/", "Consulta o actualiza confirmación de pruebas."),
      item("GET", "/gestion-personal/estudiante/otorgamiento/", "Consulta la carrera otorgada."),
    ],
  },
  {
    name: "Importación, resultados y otorgamiento",
    description: "Excel, PDF, escalafón, resultados, reclamaciones y consultas públicas.",
    endpoints: [
      item("POST", "/import-export/import/plan-plaza/", "Importa plan de plazas desde Excel."),
      item("GET", "/import-export/export/plan-plaza/", "Exporta plan de plazas."),
      item("GET", "/import-export/export/plan-plaza/plantilla/", "Descarga plantilla de plan de plazas."),
      item("GET", "/import-export/export/boleta-interes/", "Exporta boleta de interés en PDF."),
      item("GET", "/import-export/export/boleta-solicitud/", "Exporta boletas de solicitud en PDF."),
      item("GET", "/import-export/export/boleta-solicitud/{id}/", "Exporta una boleta específica."),
      item("POST", "/import-export/import/otorgamiento/", "Importa otorgamientos desde Excel."),
      item("POST", "/import-export/import/cortes-carrera/", "Importa índices de corte."),
      item("GET", "/import-export/otorgamiento/resumen/", "Resumen de otorgamientos."),
      item("GET", "/import-export/otorgamiento/exportar/{tipo}/", "Exporta otorgamiento por tipo."),
      item("GET", "/import-export/otorgamiento/escuela/", "Lista otorgamientos de escuela."),
      item("POST", "/import-export/import/carreras/", "Importa carreras desde Excel."),
      item("GET", "/import-export/export/carreras/", "Exporta catálogo de carreras."),
      item("POST", "/import-export/import/escalafon/", "Importa escalafón desde Excel."),
      item("POST", "/import-export/import/resultados/", "Importa resultados desde Excel."),
      item("GET", "/import-export/resultados/", "Lista resultados de exámenes."),
      item("GET", "/import-export/resultados/landing/", "Consulta pública de resultados.", "Consulta pública configurada"),
      item("GET", "/import-export/otorgamiento/landing/", "Consulta pública de otorgamientos.", "Consulta pública configurada"),
      item("GET", "/import-export/cortes/landing/", "Consulta pública de índices de corte.", "Consulta pública configurada"),
      item("GET", "/import-export/landing/export/{tipo}/", "Exportación de datos de landing.", "Consulta pública configurada"),
      item("POST", "/import-export/resultados/{id}/reclamar/", "Crea reclamación de resultado."),
      item("GET", "/import-export/resultados/reclamaciones/", "Lista reclamaciones."),
      item("PATCH", "/import-export/resultados/reclamaciones/{id}/", "Decide una reclamación."),
      item("GET", "/import-export/resultados/exportar/", "Exporta resultados."),
      item("GET", "/import-export/export/escalafon/", "Exporta escalafón de escuela."),
      item("GET", "/import-export/escalafon/", "Lista entradas del escalafón."),
      item("GET", "/import-export/escalafon/resumen-provincial/", "Resumen provincial del escalafón."),
      item("GET", "/import-export/escalafon/exportar-provincial/", "Exporta escalafón provincial."),
      item("GET", "/import-export/escalafon/plantilla/", "Descarga plantilla de escalafón."),
      item("GET, PATCH", "/import-export/escalafon/{id}/", "Consulta o edita una entrada."),
      item("POST", "/import-export/escalafon/{id}/revisar/", "Revisa una entrada."),
      item("POST", "/import-export/escalafon/enviar-comision/", "Envía escalafón a comisión."),
      item("POST", "/import-export/escalafon/mi-accion/{accion}/", "Registra la acción del estudiante."),
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
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const apiOrigin = import.meta.env.VITE_API_ORIGIN || origin;
  const docsUrl = `${apiOrigin}${API_PREFIX}/docs/`;
  const schemaUrl = `${apiOrigin}${API_PREFIX}/schema/`;

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.eyebrow}>API REST - IngresoSUP</p>
          <div className={styles.heroTop}>
            <div>
              <h1 className={styles.title}>Interoperabilidad institucional</h1>
              <p className={styles.description}>Referencia de las rutas reales del backend Django REST. Las respuestas usan JSON salvo las exportaciones de archivos.</p>
            </div>
            <div className={styles.countBox}>
              <p className={styles.countValue}>{endpointCount}</p>
              <p className={styles.countLabel}>rutas documentadas</p>
            </div>
          </div>
        </div>
        <div className={styles.linksGrid}>
          <div className={styles.baseUrlBox}>
            <p className={styles.linkLabel}>URL base versionada</p>
            <code className={styles.baseUrlCode}>{apiOrigin}{API_PREFIX}/</code>
          </div>
          <a href={docsUrl} target="_blank" rel="noreferrer" className={styles.linkCardAccent}>
            <p className={styles.linkLabelAccent}>Swagger UI</p>
            <p className={styles.linkTitle}>Abrir documentación interactiva</p>
            <code className={styles.linkUrlAccent}>{docsUrl}</code>
          </a>
          <a href={schemaUrl} target="_blank" rel="noreferrer" className={styles.linkCardPlain}>
            <p className={styles.linkLabel}>OpenAPI 3.0</p>
            <p className={styles.linkTitle}>Abrir esquema JSON</p>
            <code className={styles.linkUrlPlain}>{schemaUrl}</code>
          </a>
        </div>
        <div className={styles.filterBar}>
          <div className={styles.filterRow}>
            <label className={styles.searchField}>
              <span className="sr-only">Buscar endpoint</span>
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por ruta, método o descripción..." />
            </label>
            <Select value={selectedGroup} onChange={(event) => setSelectedGroup(event.target.value)}>
              <option>Todos</option>
              {groups.map((group) => <option key={group.name}>{group.name}</option>)}
            </Select>
          </div>
          <p className={styles.authNote}>Autenticación: <strong>Authorization: Bearer &lt;access&gt;</strong>. Las peticiones están sujetas a rate limiting.</p>
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
