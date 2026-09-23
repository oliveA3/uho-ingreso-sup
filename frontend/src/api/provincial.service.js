import { request, requestImport } from "./httpClient";

export function fetchProvincialDashboard() {
  return request("/gestion-provincial/dashboard/");
}

export function fetchProvincialSchools() {
  return request("/gestion-provincial/escuelas/");
}

export function createProvincialSchool(payload) {
  return request("/gestion-provincial/escuelas/", { method: "POST", body: payload });
}

export function updateProvincialSchool(id, payload) {
  return request(`/gestion-provincial/escuelas/${id}/`, { method: "PATCH", body: payload });
}

export function deleteProvincialSchool(id) {
  return request(`/gestion-provincial/escuelas/${id}/`, { method: "DELETE" });
}

export function fetchProvincialProvinces() {
  return request("/gestion-provincial/provincias/");
}

export function fetchProvincialCes() {
  return request("/gestion-provincial/ces/");
}

export function fetchProvincialTiposOtorgamiento() {
  return request("/gestion-provincial/tipos-otorgamiento/");
}

export function fetchProvincialEtapas() {
  return request("/gestion-provincial/etapas/");
}

export function activateProvincialEtapa(id, dates) {
  return request(`/gestion-provincial/etapas/${id}/activar/`, { method: "POST", body: dates });
}

export function closeProvincialEtapa(id) {
  return request(`/gestion-provincial/etapas/${id}/cerrar/`, { method: "POST" });
}

export function resetProvincialEtapas() {
  return request("/gestion-provincial/etapas/reiniciar/", { method: "POST" });
}

export function createProvincialProceso(anio) {
  return request("/gestion-provincial/procesos/", { method: "POST", body: { anio: `${anio}-01-01` } });
}

export function fetchProvincialProceso() {
  return request("/gestion-provincial/procesos/");
}

export function fetchCommissionPendingModifications() {
  return request("/gestion-provincial/boletas-solicitud/modificaciones/");
}

export function resolveCommissionModification(ballotId, action, message = "") {
  return request(`/gestion-provincial/boletas-solicitud/${ballotId}/autorizar-modificacion/`, {
    method: "POST",
    body: { action, mensaje: message },
  });
}

export function fetchProvincialMunicipalities(provinceId) {
  return request("/gestion-provincial/municipios/", { params: provinceId ? { provincia: provinceId } : undefined });
}

export function fetchProvincialUsers() {
  return request("/gestion-provincial/usuarios/");
}

export function createProvincialUser(payload) {
  return request("/gestion-provincial/usuarios/", { method: "POST", body: payload });
}

export function updateProvincialUser(id, payload) {
  return request(`/gestion-provincial/usuarios/${id}/`, { method: "PATCH", body: payload });
}

export function deleteProvincialUser(id) {
  return request(`/gestion-provincial/usuarios/${id}/`, { method: "DELETE" });
}

export function fetchPlanPlazas() {
  return request("/gestion-provincial/plan-plazas/");
}

export function createPlanPlaza(payload) {
  return request("/gestion-provincial/plan-plazas/", { method: "POST", body: payload });
}

export function updatePlanPlaza(id, payload) {
  return request(`/gestion-provincial/plan-plazas/${id}/`, { method: "PATCH", body: payload });
}

export function deletePlanPlaza(id) {
  return request(`/gestion-provincial/plan-plazas/${id}/`, { method: "DELETE" });
}

export function importPlanPlaza(file) {
  const form = new FormData();
  form.append("file", file);
  return requestImport("/import-export/import/plan-plaza/", form);
}

export function downloadPlanPlazaTemplate() {
  return request("/import-export/export/plan-plaza/plantilla/", {
    blob: true,
    blobErrorMessage: "No se pudo descargar la plantilla del plan de plazas.",
  });
}

export function downloadPlanPlazaExport({ anio, provincia }) {
  const params = {};
  if (anio) params.anio = String(anio);
  if (provincia && provincia !== "Todos") params.provincia = provincia;
  return request("/import-export/export/plan-plaza/", {
    params,
    blob: true,
    blobErrorMessage: "No se pudo exportar el plan de plazas.",
  });
}

export function fetchProvincialCareers(search = "") {
  return request("/gestion-provincial/carreras/", { params: search ? { search } : undefined });
}

export function createProvincialCareer(payload) {
  return request("/gestion-provincial/carreras/", { method: "POST", body: payload });
}

export function updateProvincialCareer(id, payload) {
  return request(`/gestion-provincial/carreras/${id}/`, { method: "PATCH", body: payload });
}

export function deleteProvincialCareer(id) {
  return request(`/gestion-provincial/carreras/${id}/`, { method: "DELETE" });
}

export function importProvincialCareers(file) {
  const form = new FormData();
  form.append("file", file);
  return requestImport("/import-export/import/carreras/", form);
}

export function exportProvincialCareers() {
  return request("/import-export/export/carreras/", {
    blob: true,
    blobErrorMessage: "No se pudo exportar el catálogo de carreras.",
  });
}
