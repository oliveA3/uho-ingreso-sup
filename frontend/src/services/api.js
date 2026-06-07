const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api";

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
  const response = await fetch(`${API_BASE}/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(credentials),
  });
  return handleResponse(response);
}

export async function register(payload) {
  const response = await fetch(`${API_BASE}/auth/register/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

export async function logout() {
  const response = await fetch(`${API_BASE}/auth/logout/`, {
    method: "POST",
    credentials: "include",
  });
  return handleResponse(response);
}

export async function fetchCurrentUser() {
  const response = await fetch(`${API_BASE}/auth/me/`, {
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
