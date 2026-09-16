import { request, resourceUrl } from "./httpClient";

export function fetchEscalafon() {
  return request("/import-export/escalafon/");
}

export function importEscalafon(file, escuela, anio) {
  const form = new FormData();
  form.append("file", file);
  form.append("escuela", escuela);
  form.append("anio", anio);
  return request("/import-export/import/escalafon/", { method: "POST", body: form });
}

export function getEscalafonTemplateUrl() {
  return resourceUrl("/import-export/escalafon/plantilla/");
}

export function downloadEscalafonTemplate() {
  return request("/import-export/escalafon/plantilla/", {
    blob: true,
    blobErrorMessage: "No se pudo descargar la plantilla.",
  });
}

export function getEscalafonExportUrl(escuela, anio) {
  return resourceUrl("/import-export/export/escalafon/", { escuela, anio });
}

export function downloadSchoolEscalafon(schoolId) {
  return request("/import-export/export/escalafon/", {
    params: { escuela: schoolId, anio: new Date().getFullYear() },
    blob: true,
    blobErrorMessage: "No se pudo exportar el escalafón de la escuela.",
  });
}

export function updateEscalafonEntry(id, payload) {
  return request(`/import-export/escalafon/${id}/`, { method: "PATCH", body: payload });
}

export function sendEscalafonToCommission() {
  return request("/import-export/escalafon/enviar-comision/", { method: "POST" });
}

export function markEscalafonReviewAsReviewed(id) {
  return request(`/import-export/escalafon/${id}/revisar/`, { method: "POST" });
}

export function reviewEscalafonEntry(id) {
  return request(`/import-export/escalafon/${id}/revisar/`, { method: "POST" });
}

export function submitEscalafonAction(action, causa = "") {
  return request(`/import-export/escalafon/mi-accion/${action}/`, { method: "POST", body: { causa } });
}

export function fetchProvincialEscalafonSummary() {
  return request("/import-export/escalafon/resumen-provincial/");
}

export function downloadProvincialEscalafon() {
  return request("/import-export/escalafon/exportar-provincial/", {
    blob: true,
    blobErrorMessage: "No se pudo exportar el escalafón provincial.",
  });
}
