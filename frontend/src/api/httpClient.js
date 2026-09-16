export const API_BASE = import.meta.env.VITE_API_BASE || "/api";

const ACCESS_TOKEN_KEY = "ingresosup_access_token";
const REFRESH_TOKEN_KEY = "ingresosup_refresh_token";

function getAccessToken() {
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

function saveTokens(tokens) {
  if (tokens?.access) window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access);
  if (tokens?.refresh) window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh);
}

export function clearTokens() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function getRefreshToken() {
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

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
  const refresh = getRefreshToken();
  if (!refresh) return false;
  const response = await window.fetch(`${API_BASE}/authentication/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!response.ok) {
    clearTokens();
    return false;
  }
  const tokens = await response.json();
  saveTokens(tokens);
  return Boolean(tokens.access);
}

export async function apiFetch(url, options = {}, retried = false) {
  const headers = new Headers(options.headers || {});
  const access = getAccessToken();
  if (access) headers.set("Authorization", `Bearer ${access}`);
  const response = await window.fetch(url, { ...options, headers });
  if (response.status === 401 && !retried && !url.includes("/authentication/token/refresh/")) {
    if (await refreshAccessToken()) return apiFetch(url, options, true);
  }
  return response;
}

export function persistAuthTokens(tokens) {
  saveTokens(tokens);
}

function formatApiError(body) {
  if (!body) return "Ocurrió un error en la comunicación con el servidor.";
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
  return messages.join(" ") || "Ocurrió un error en la comunicación con el servidor.";
}

export async function handleResponse(response) {
  const isJson = response.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await response.json() : null;
  if (!response.ok) {
    throw new Error(formatApiError(body));
  }
  return body;
}

export async function handleBlobResponse(response, errorMessage) {
  if (!response.ok) throw new Error(errorMessage);
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

export function resourceUrl(path, params) {
  return `${API_BASE}${path}${params ? buildQuery(params) : ""}`;
}
