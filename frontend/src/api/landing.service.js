import { request } from "./httpClient";

export function fetchLandingData() {
  return request("/gestion-provincial/etapas/disponibilidad/", { credentials: "same-origin" });
}

export function fetchRegistrationAvailability() {
  return request("/gestion-provincial/etapas/disponibilidad/", { credentials: "same-origin" });
}

export function fetchLandingResults(filters = {}) {
  return request("/import-export/resultados/landing/", { params: filters });
}

export function fetchLandingOtorgamientos(filters = {}) {
  return request("/import-export/otorgamiento/landing/", { params: filters });
}

export function fetchLandingCortes(filters = {}) {
  return request("/import-export/cortes/landing/", { params: filters });
}

export function downloadLandingExcel(kind, filters = {}) {
  return request(`/import-export/landing/export/${kind}/`, {
    params: filters,
    blob: true,
    blobErrorMessage: "No se pudo descargar el Excel filtrado.",
  });
}
