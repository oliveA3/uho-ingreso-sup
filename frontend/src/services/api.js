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
  // Placeholder: en la siguiente fase se activará el endpoint real del backend.
  return {
    success: true,
  };
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
