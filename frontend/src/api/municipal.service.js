import { request } from "./httpClient";

export function fetchMunicipalSchools() {
  return request("/gestion-municipal/escuelas/");
}

export function createMunicipalSchool(payload) {
  return request("/gestion-municipal/escuelas/", { method: "POST", body: payload });
}

export function updateMunicipalSchool(id, payload) {
  return request(`/gestion-municipal/escuelas/${id}/`, { method: "PATCH", body: payload });
}

export function deleteMunicipalSchool(id) {
  return request(`/gestion-municipal/escuelas/${id}/`, { method: "DELETE" });
}

export function fetchMunicipalUsers() {
  return request("/gestion-municipal/usuarios/");
}

export function createMunicipalUser(payload) {
  return request("/gestion-municipal/usuarios/", { method: "POST", body: payload });
}

export function updateMunicipalUser(id, payload) {
  return request(`/gestion-municipal/usuarios/${id}/`, { method: "PATCH", body: payload });
}

export function deleteMunicipalUser(id) {
  return request(`/gestion-municipal/usuarios/${id}/`, { method: "DELETE" });
}
