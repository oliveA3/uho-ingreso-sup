import { apiFetch, API_BASE, csrfHeaders, handleResponse, request } from "./httpClient";

export async function login(credentials) {
  const csrf = await csrfHeaders();
  const response = await apiFetch(`${API_BASE}/authentication/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...csrf },
    credentials: "include",
    body: JSON.stringify(credentials),
  });
  return handleResponse(response);
}

export function register(payload) {
  return request("/authentication/register/", { method: "POST", body: payload });
}

export function verifyEmail(payload) {
  return request("/authentication/verify-email/", { method: "POST", body: payload });
}

export function changePendingEmail(payload) {
  return request("/authentication/change-pending-email/", { method: "POST", body: payload, credentials: "same-origin" });
}

export async function logout() {
  const csrf = await csrfHeaders();
  const response = await apiFetch(`${API_BASE}/authentication/logout/`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...csrf },
  });
  return handleResponse(response);
}

export async function fetchRegisterSchema() {
  const response = await apiFetch(`${API_BASE}/authentication/register/`, {
    method: "OPTIONS",
    headers: { "Content-Type": "application/json" },
  });
  return handleResponse(response);
}

export function fetchCurrentUser() {
  return request("/authentication/me/");
}
