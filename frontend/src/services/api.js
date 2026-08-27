const API_BASE = import.meta.env.VITE_API_BASE || "/api";

function getCookie(name) {
  return document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.split("=")
    .slice(1)
    .join("=");
}

async function csrfHeaders() {
  if (!getCookie("csrftoken")) {
    await fetch(`${API_BASE}/authentication/csrf/`, {
      credentials: "include",
    });
  }
  const token = getCookie("csrftoken");
  return token ? { "X-CSRFToken": decodeURIComponent(token) } : {};
}

async function handleResponse(response) {
  const isJson = response.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await response.json() : null;
  if (!response.ok) {
    const message = formatApiError(body);
    throw new Error(message);
  }
  return body;
}

function formatApiError(body) {
  if (!body) return "Ocurrió un error en la comunicación con el servidor.";
  if (typeof body === "string") return body;
  if (body.detail || body.error) return body.detail || body.error;

  const labels = {
    username: "Usuario",
    email: "Correo",
    password: "Contraseña",
    rol: "Rol",
    provincia: "Provincia",
    municipio: "Municipio",
    escuela: "Escuela",
    first_name: "Nombre",
    last_name: "Apellidos",
  };
  const messages = Object.entries(body).flatMap(([field, errors]) => {
    const values = Array.isArray(errors) ? errors : [errors];
    return values.map((error) => `${labels[field] || field}: ${error}`);
  });
  return messages.join(" ") || "Ocurrió un error en la comunicación con el servidor.";
}

export async function fetchLandingData() {
  const response = await fetch(`${API_BASE}/gestion-provincial/etapas/disponibilidad/`);
  return handleResponse(response);
}

export async function login(credentials) {
  const csrf = await csrfHeaders();
  const response = await fetch(`${API_BASE}/authentication/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...csrf },
    credentials: "include",
    body: JSON.stringify(credentials),
  });
  return handleResponse(response);
}

export async function register(payload) {
  const response = await fetch(`${API_BASE}/authentication/register/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

export async function logout() {
  const csrf = await csrfHeaders();
  const response = await fetch(`${API_BASE}/authentication/logout/`, {
    method: "POST",
    credentials: "include",
    headers: csrf,
  });
  return handleResponse(response);
}

export async function fetchRegisterSchema() {
  const response = await fetch(`${API_BASE}/authentication/register/`, {
    method: "OPTIONS",
    headers: { "Content-Type": "application/json" },
  });
  return handleResponse(response);
}


export async function fetchCurrentUser() {
  const response = await fetch(`${API_BASE}/authentication/me/`, {
    credentials: "include",
  });
  return handleResponse(response);
}

export async function fetchStudentDashboard() {
  const response = await fetch(`${API_BASE}/gestion-personal/estudiante/dashboard/`, { credentials: "include" });
  return handleResponse(response);
}

export async function fetchSuperAdminMetrics() {
  const response = await fetch(`${API_BASE}/superadmin/dashboard/`, {
    credentials: "include",
  });
  return handleResponse(response);
}

export async function fetchSuperAdminConfig() {
  const response = await fetch(`${API_BASE}/superadmin/config/`, {
    credentials: "include",
  });
  return handleResponse(response);
}

export async function updateSuperAdminConfig(payload) {
  const csrf = await csrfHeaders();
  const response = await fetch(`${API_BASE}/superadmin/config/`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...csrf },
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

export async function fetchNomencladoresHealth() {
  const response = await fetch(`${API_BASE}/core/health/`, {
    credentials: "include",
  });
  return handleResponse(response);
}

export async function fetchRoleAdmin() {
  const response = await fetch(`${API_BASE}/roles/admin/`, {
    credentials: "include",
  });
  return handleResponse(response);
}

export async function fetchSuperAdminDashboard() {
  const response = await fetch(`${API_BASE}/superadmin/dashboard/`, {
    credentials: "include",
  });
  return handleResponse(response);
}

export async function fetchSuperAdminCatalog(resource, params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value)
  ).toString();
  const response = await fetch(`${API_BASE}/superadmin/${resource}/${query ? `?${query}` : ""}`, {
    credentials: "include",
  });
  return handleResponse(response);
}

export async function createSuperAdminCatalogItem(resource, payload) {
  const csrf = await csrfHeaders();
  const response = await fetch(`${API_BASE}/superadmin/${resource}/`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...csrf },
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

export async function updateSuperAdminCatalogItem(resource, id, payload) {
  const csrf = await csrfHeaders();
  const response = await fetch(`${API_BASE}/superadmin/${resource}/${id}/`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...csrf },
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

export async function deleteSuperAdminCatalogItem(resource, id) {
  const csrf = await csrfHeaders();
  const response = await fetch(`${API_BASE}/superadmin/${resource}/${id}/`, {
    method: "DELETE",
    credentials: "include",
    headers: csrf,
  });
  return handleResponse(response);
}

export async function fetchSuperAdminUsers(filters = {}) {
  const params = new URLSearchParams(
    Object.entries(filters).filter(([, value]) => value)
  );
  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(`${API_BASE}/superadmin/usuarios/${query}`, {
    credentials: "include",
  });
  return handleResponse(response);
}

export async function createSuperAdminUser(payload) {
  const csrf = await csrfHeaders();
  const response = await fetch(`${API_BASE}/superadmin/usuarios/`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...csrf },
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

export async function updateSuperAdminUser(id, payload) {
  const csrf = await csrfHeaders();
  const response = await fetch(`${API_BASE}/superadmin/usuarios/${id}/`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...csrf },
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

export async function deleteSuperAdminUser(id) {
  const csrf = await csrfHeaders();
  const response = await fetch(`${API_BASE}/superadmin/usuarios/${id}/`, {
    method: "DELETE",
    credentials: "include",
    headers: csrf,
  });
  return handleResponse(response);
}

export async function fetchProvincialDashboard() {
  const response = await fetch(`${API_BASE}/gestion-provincial/dashboard/`, { credentials: "include" });
  return handleResponse(response);
}

export async function fetchAuditLogs(filters = {}) {
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value)).toString();
  const response = await fetch(`${API_BASE}/core/logs/${query ? `?${query}` : ""}`, { credentials: "include" });
  return handleResponse(response);
}

export function getAuditLogExportUrl(format = "xlsx") {
  return `${API_BASE}/core/logs/export/${format === "pdf" ? "pdf/" : ""}`;
}

export async function fetchProvincialSchools() {
  const response = await fetch(`${API_BASE}/gestion-provincial/escuelas/`, { credentials: "include" });
  return handleResponse(response);
}

export async function fetchProvincialProvinces() {
  const response = await fetch(`${API_BASE}/gestion-provincial/provincias/`, { credentials: "include" });
  return handleResponse(response);
}

export async function fetchProvincialCes() {
  const response = await fetch(`${API_BASE}/gestion-provincial/ces/`, { credentials: "include" });
  return handleResponse(response);
}

export async function fetchProvincialEtapas() {
  const response = await fetch(`${API_BASE}/gestion-provincial/etapas/`, {
    credentials: "include",
  });
  return handleResponse(response);
}

export async function fetchRegistrationAvailability() {
  const response = await fetch(`${API_BASE}/gestion-provincial/etapas/disponibilidad/`);
  return handleResponse(response);
}

export async function fetchEscalafon() {
  const response = await fetch(`${API_BASE}/import-export/escalafon/`, { credentials: "include" });
  return handleResponse(response);
}

export async function fetchStudentsWithoutAccount() {
  const response = await fetch(`${API_BASE}/gestion-escuela/estudiantes/sin-cuenta/`, { credentials: "include" });
  return handleResponse(response);
}

export async function fetchProvincialEscalafonSummary() {
  const response = await fetch(`${API_BASE}/import-export/escalafon/resumen-provincial/`, { credentials: "include" });
  return handleResponse(response);
}

export async function downloadProvincialEscalafon() {
  const response = await fetch(`${API_BASE}/import-export/escalafon/exportar-provincial/`, { credentials: "include" });
  if (!response.ok) throw new Error("No se pudo exportar el escalafón provincial.");
  return response.blob();
}

export async function downloadSchoolEscalafon(schoolId) {
  const response = await fetch(`${API_BASE}/import-export/export/escalafon/?escuela=${schoolId}&anio=${new Date().getFullYear()}`, { credentials: "include" });
  if (!response.ok) throw new Error("No se pudo exportar el escalafón de la escuela.");
  return response.blob();
}

export async function importEscalafon(file, escuela, anio) {
  const csrf = await csrfHeaders();
  const form = new FormData();
  form.append("file", file);
  form.append("escuela", escuela);
  form.append("anio", anio);
  const response = await fetch(`${API_BASE}/import-export/import/escalafon/`, { method: "POST", credentials: "include", headers: csrf, body: form });
  return handleResponse(response);
}

export function getEscalafonTemplateUrl() {
  return `${API_BASE}/import-export/escalafon/plantilla/`;
}

export async function downloadEscalafonTemplate() {
  const response = await fetch(getEscalafonTemplateUrl(), { credentials: "include" });
  if (!response.ok) throw new Error("No se pudo descargar la plantilla.");
  return response.blob();
}

export function getEscalafonExportUrl(escuela, anio) {
  return `${API_BASE}/import-export/export/escalafon/?escuela=${escuela}&anio=${anio}`;
}

export async function updateEscalafonEntry(id, payload) {
  const csrf = await csrfHeaders();
  const response = await fetch(`${API_BASE}/import-export/escalafon/${id}/`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json", ...csrf }, body: JSON.stringify(payload) });
  return handleResponse(response);
}

export async function sendEscalafonToCommission() {
  const csrf = await csrfHeaders();
  const response = await fetch(`${API_BASE}/import-export/escalafon/enviar-comision/`, { method: "POST", credentials: "include", headers: csrf });
  return handleResponse(response);
}

export async function markEscalafonReviewAsReviewed(id) {
  const csrf = await csrfHeaders();
  const response = await fetch(`${API_BASE}/import-export/escalafon/${id}/revisar/`, { method: "POST", credentials: "include", headers: csrf });
  return handleResponse(response);
}

export async function submitEscalafonAction(action, causa = "") {
  const csrf = await csrfHeaders();
  const response = await fetch(`${API_BASE}/import-export/escalafon/mi-accion/${action}/`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", ...csrf }, body: JSON.stringify({ causa }) });
  return handleResponse(response);
}

export async function reviewEscalafonEntry(id) {
  const csrf = await csrfHeaders();
  const response = await fetch(`${API_BASE}/import-export/escalafon/${id}/revisar/`, { method: "POST", credentials: "include", headers: csrf });
  return handleResponse(response);
}

export async function createProvincialProceso(anio) {
  const csrf = await csrfHeaders();
  const response = await fetch(`${API_BASE}/gestion-provincial/procesos/`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...csrf },
    body: JSON.stringify({ anio: `${anio}-01-01` }),
  });
  return handleResponse(response);
}

export async function fetchProvincialProceso() {
  const response = await fetch(`${API_BASE}/gestion-provincial/procesos/`, {
    credentials: "include",
  });
  return handleResponse(response);
}

export async function activateProvincialEtapa(id, dates) {
  const csrf = await csrfHeaders();
  const response = await fetch(`${API_BASE}/gestion-provincial/etapas/${id}/activar/`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...csrf },
    body: JSON.stringify(dates),
  });
  return handleResponse(response);
}

export async function closeProvincialEtapa(id) {
  const csrf = await csrfHeaders();
  const response = await fetch(`${API_BASE}/gestion-provincial/etapas/${id}/cerrar/`, {
    method: "POST",
    credentials: "include",
    headers: csrf,
  });
  return handleResponse(response);
}

export async function resetProvincialEtapas() {
  const csrf = await csrfHeaders();
  const response = await fetch(`${API_BASE}/gestion-provincial/etapas/reiniciar/`, {
    method: "POST",
    credentials: "include",
    headers: csrf,
  });
  return handleResponse(response);
}

export async function fetchProvincialMunicipalities(provinceId) {
  const query = provinceId ? `?provincia=${provinceId}` : "";
  const response = await fetch(`${API_BASE}/gestion-provincial/municipios/${query}`, { credentials: "include" });
  return handleResponse(response);
}

export async function fetchProvincialUsers() {
  const response = await fetch(`${API_BASE}/gestion-provincial/usuarios/`, { credentials: "include" });
  return handleResponse(response);
}

export async function createProvincialUser(payload) {
  const csrf = await csrfHeaders();
  const response = await fetch(`${API_BASE}/gestion-provincial/usuarios/`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...csrf },
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

export async function updateProvincialUser(id, payload) {
  const csrf = await csrfHeaders();
  const response = await fetch(`${API_BASE}/gestion-provincial/usuarios/${id}/`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...csrf },
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

export async function deleteProvincialUser(id) {
  const csrf = await csrfHeaders();
  const response = await fetch(`${API_BASE}/gestion-provincial/usuarios/${id}/`, {
    method: "DELETE",
    credentials: "include",
    headers: csrf,
  });
  return handleResponse(response);
}

export async function createProvincialSchool(payload) {
  const csrf = await csrfHeaders();
  const response = await fetch(`${API_BASE}/gestion-provincial/escuelas/`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", ...csrf }, body: JSON.stringify(payload) });
  return handleResponse(response);
}

export async function updateProvincialSchool(id, payload) {
  const csrf = await csrfHeaders();
  const response = await fetch(`${API_BASE}/gestion-provincial/escuelas/${id}/`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json", ...csrf }, body: JSON.stringify(payload) });
  return handleResponse(response);
}

export async function deleteProvincialSchool(id) {
  const csrf = await csrfHeaders();
  const response = await fetch(`${API_BASE}/gestion-provincial/escuelas/${id}/`, { method: "DELETE", credentials: "include", headers: csrf });
  return handleResponse(response);
}

export async function fetchMunicipalSchools() {
  const response = await fetch(`${API_BASE}/gestion-municipal/escuelas/`, { credentials: "include" });
  return handleResponse(response);
}

export async function createMunicipalSchool(payload) {
  const csrf = await csrfHeaders();
  const response = await fetch(`${API_BASE}/gestion-municipal/escuelas/`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", ...csrf }, body: JSON.stringify(payload) });
  return handleResponse(response);
}

export async function updateMunicipalSchool(id, payload) {
  const csrf = await csrfHeaders();
  const response = await fetch(`${API_BASE}/gestion-municipal/escuelas/${id}/`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json", ...csrf }, body: JSON.stringify(payload) });
  return handleResponse(response);
}

export async function deleteMunicipalSchool(id) {
  const csrf = await csrfHeaders();
  const response = await fetch(`${API_BASE}/gestion-municipal/escuelas/${id}/`, { method: "DELETE", credentials: "include", headers: csrf });
  return handleResponse(response);
}

export async function fetchMunicipalUsers() {
  const response = await fetch(`${API_BASE}/gestion-municipal/usuarios/`, { credentials: "include" });
  return handleResponse(response);
}

export async function createMunicipalUser(payload) {
  const csrf = await csrfHeaders();
  const response = await fetch(`${API_BASE}/gestion-municipal/usuarios/`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", ...csrf }, body: JSON.stringify(payload) });
  return handleResponse(response);
}

export async function updateMunicipalUser(id, payload) {
  const csrf = await csrfHeaders();
  const response = await fetch(`${API_BASE}/gestion-municipal/usuarios/${id}/`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json", ...csrf }, body: JSON.stringify(payload) });
  return handleResponse(response);
}

export async function deleteMunicipalUser(id) {
  const csrf = await csrfHeaders();
  const response = await fetch(`${API_BASE}/gestion-municipal/usuarios/${id}/`, { method: "DELETE", credentials: "include", headers: csrf });
  return handleResponse(response);
}

export async function fetchProvincialCareers(search = "") {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  const response = await fetch(`${API_BASE}/gestion-provincial/carreras/${query}`, { credentials: "include" });
  return handleResponse(response);
}

export async function createProvincialCareer(payload) {
  const csrf = await csrfHeaders();
  const response = await fetch(`${API_BASE}/gestion-provincial/carreras/`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", ...csrf }, body: JSON.stringify(payload) });
  return handleResponse(response);
}

export async function updateProvincialCareer(id, payload) {
  const csrf = await csrfHeaders();
  const response = await fetch(`${API_BASE}/gestion-provincial/carreras/${id}/`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json", ...csrf }, body: JSON.stringify(payload) });
  return handleResponse(response);
}

export async function deleteProvincialCareer(id) {
  const csrf = await csrfHeaders();
  const response = await fetch(`${API_BASE}/gestion-provincial/carreras/${id}/`, { method: "DELETE", credentials: "include", headers: csrf });
  return handleResponse(response);
}

export async function importProvincialCareers(file) {
  const csrf = await csrfHeaders();
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${API_BASE}/import-export/import/carreras/`, { method: "POST", credentials: "include", headers: csrf, body: formData });
  return handleResponse(response);
}

export async function exportProvincialCareers() {
  const response = await fetch(`${API_BASE}/import-export/export/carreras/`, { credentials: "include" });
  if (!response.ok) throw new Error("No se pudo exportar el catálogo de carreras.");
  return response.blob();
}
