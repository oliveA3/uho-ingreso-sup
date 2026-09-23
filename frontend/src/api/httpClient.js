export const API_BASE = import.meta.env.VITE_API_BASE || "/api/v1";

// Access/refresh JWTs live in httpOnly cookies set by the backend — they are
// never readable from JS, which keeps them safe from XSS token theft.

function getCookie(name) {
  return document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.split("=")
    .slice(1)
    .join("=");
}

export async function csrfHeaders() {
  if (!getCookie("csrftoken")) {
    await window.fetch(`${API_BASE}/authentication/csrf/`, {
      credentials: "include",
    });
  }
  const token = getCookie("csrftoken");
  return token ? { "X-CSRFToken": decodeURIComponent(token) } : {};
}

async function refreshAccessToken() {
  const csrf = await csrfHeaders();
  const response = await window.fetch(`${API_BASE}/authentication/token/refresh/`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...csrf },
  });
  return response.ok;
}

export async function apiFetch(url, options = {}, retried = false) {
  const response = await window.fetch(url, { ...options, credentials: options.credentials ?? "include" });
  if (response.status === 401 && !retried && !url.includes("/authentication/token/refresh/")) {
    if (await refreshAccessToken()) return apiFetch(url, options, true);
  }
  return response;
}

// Backend responses use a {success, data, error} envelope; unwrap it so the
// rest of the frontend can keep working with the underlying payload.
function isEnvelope(body) {
  return Boolean(body) && typeof body === "object" && "success" in body && "data" in body && "error" in body;
}

const GENERIC_ERROR_MESSAGE = "Ocurrió un error en la comunicación con el servidor. Verifica tu conexión e inténtalo de nuevo; si el problema persiste, contacta al administrador.";

function formatApiError(body) {
  if (!body) return GENERIC_ERROR_MESSAGE;
  if (isEnvelope(body)) body = body.error;
  if (!body) return GENERIC_ERROR_MESSAGE;
  if (typeof body === "string") return body;
  if (body.detail || body.error) return body.detail || body.error;

  if (Array.isArray(body.errors)) {
    return body.errors
      .map((error) => {
        if (typeof error === "string") return error;
        if (typeof error === "object") {
          const rowText = error.row ? `Fila ${error.row}: ` : "";
          return `${rowText}${error.error || error.detail || error.message || JSON.stringify(error)}`;
        }
        return String(error);
      })
      .join(" | ");
  }

  const labels = {
    non_field_errors: "",
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
    if (field === "errors") return [];
    const values = Array.isArray(errors) ? errors : [errors];
    return values.map((error) => {
      const label = labels[field] ?? field.replaceAll("_", " ");
      const text = typeof error === "object" && error !== null
        ? error.error || error.detail || error.message || "Revisa los datos indicados."
        : String(error);
      if (!label) return text;
      return `${label.charAt(0).toUpperCase()}${label.slice(1)}: ${text}`;
    });
  });
  return messages.join(" ") || GENERIC_ERROR_MESSAGE;
}

export async function handleResponse(response) {
  const isJson = response.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await response.json() : null;
  if (!response.ok) {
    throw new Error(formatApiError(body));
  }
  return isEnvelope(body) ? body.data : body;
}

export async function handleBlobResponse(response, errorMessage) {
  if (!response.ok) throw new Error(errorMessage || GENERIC_ERROR_MESSAGE);
  return response.blob();
}

function buildQuery(params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value)).toString();
  return query ? `?${query}` : "";
}

/** Thin JSON/CSRF-aware wrapper around apiFetch, shared by every domain service. */
export async function request(path, { method = "GET", body, params, credentials = "include", blob = false, blobErrorMessage } = {}) {
  const needsCsrf = method !== "GET";
  const csrf = needsCsrf ? await csrfHeaders() : {};
  const isFormData = body instanceof FormData;
  const headers = { ...csrf };
  if (body && !isFormData) headers["Content-Type"] = "application/json";

  const response = await apiFetch(`${API_BASE}${path}${params ? buildQuery(params) : ""}`, {
    method,
    credentials,
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  return blob ? handleBlobResponse(response, blobErrorMessage) : handleResponse(response);
}

const IMPORT_POLL_INTERVAL_MS = 1000;
const IMPORT_POLL_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Espera a que termine una importación asíncrona encolada en el backend (respuesta 202).
 * Resuelve con el resultado (mismo formato que devolvía la importación síncrona) o lanza Error.
 */
export async function waitForImportTask(taskId, onProgress) {
  const deadline = Date.now() + IMPORT_POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const task = await request(`/import-export/tareas/${encodeURIComponent(taskId)}/`);
    if (onProgress) onProgress(task.estado);
    if (task.estado === "completada" || task.estado === "fallida") {
      if (task.http_status < 400) return task.resultado;
      throw new Error(formatApiError(task.resultado));
    }
    await new Promise((resolve) => setTimeout(resolve, IMPORT_POLL_INTERVAL_MS));
  }
  throw new Error("La importación tarda más de lo esperado (más de 5 minutos). Espera unos minutos y revisa los datos importados antes de volver a subir el archivo; si el problema persiste, contacta al administrador.");
}

/** POST de un archivo de importación y espera al resultado de la tarea asíncrona. */
export async function requestImport(path, form, onProgress) {
  const accepted = await request(path, { method: "POST", body: form });
  if (!accepted?.task_id) return accepted;
  return waitForImportTask(accepted.task_id, onProgress);
}

export function normalizeCatalogList(response) {
  const rawList = Array.isArray(response)
    ? response
    : Array.isArray(response?.results)
      ? response.results
      : Array.isArray(response?.data)
        ? response.data
        : [];

  const seen = new Set();
  return rawList.filter((item) => {
    if (!item || typeof item !== "object") return true;
    const key = item.id != null ? `id:${item.id}` : JSON.stringify({
      nombre: item.nombre,
      codigo: item.codigo,
      provincia: item.provincia,
      municipio: item.municipio,
    });
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function resourceUrl(path, params) {
  return `${API_BASE}${path}${params ? buildQuery(params) : ""}`;
}
