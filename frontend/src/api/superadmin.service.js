import { request } from "./httpClient";

export function fetchSuperAdminDashboard() {
  return request("/superadmin/dashboard/");
}

// Kept as an alias: several pages historically imported this name for the same endpoint.
export const fetchSuperAdminMetrics = fetchSuperAdminDashboard;

export function fetchNomencladoresHealth() {
  return request("/core/health/");
}

export function fetchRoleAdmin() {
  return request("/roles/admin/");
}

export function fetchSuperAdminCatalog(resource, params = {}) {
  return request(`/superadmin/${resource}/`, { params });
}

export function createSuperAdminCatalogItem(resource, payload) {
  return request(`/superadmin/${resource}/`, { method: "POST", body: payload });
}

export function updateSuperAdminCatalogItem(resource, id, payload) {
  return request(`/superadmin/${resource}/${id}/`, { method: "PATCH", body: payload });
}

export function deleteSuperAdminCatalogItem(resource, id) {
  return request(`/superadmin/${resource}/${id}/`, { method: "DELETE" });
}

export function fetchSuperAdminUsers(filters = {}) {
  return request("/superadmin/usuarios/", { params: filters });
}

export function createSuperAdminUser(payload) {
  return request("/superadmin/usuarios/", { method: "POST", body: payload });
}

export function updateSuperAdminUser(id, payload) {
  return request(`/superadmin/usuarios/${id}/`, { method: "PATCH", body: payload });
}

export function deleteSuperAdminUser(id) {
  return request(`/superadmin/usuarios/${id}/`, { method: "DELETE" });
}
