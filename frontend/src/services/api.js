const API_BASE = import.meta.env.VITE_API_BASE || "/api";

async function handleResponse(response) {
  const isJson = response.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await response.json() : null;
  if (!response.ok) {
    const message = body?.detail || body?.error || "Ocurrió un error en la comunicación con el servidor.";
    throw new Error(message);
  }
  return body;
}

export async function fetchLandingData() {
  // Placeholder: en la siguiente fase se activará el endpoint real del backend.
  return {
    success: true,
  };
}

export async function login(credentials) {
  const response = await fetch(`${API_BASE}/authentication/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(credentials),
  });
  return handleResponse(response);
}

export async function register(payload) {
  const response = await fetch(`${API_BASE}/authentication/register/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

export async function logout() {
  const response = await fetch(`${API_BASE}/authentication/logout/`, {
    method: "POST",
    credentials: "include",
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
  const response = await fetch(`${API_BASE}/superadmin/config/`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
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
