import { request } from "./httpClient";

export function fetchStudentDashboard() {
  return request("/gestion-personal/estudiante/dashboard/");
}

export function fetchStudentInterest() {
  return request("/gestion-personal/estudiante/boleta-interes/");
}

export function addStudentInterestCareer(carrera) {
  return request("/gestion-personal/estudiante/boleta-interes/items/", { method: "POST", body: { carrera } });
}

export function removeStudentInterestCareer(itemId) {
  return request(`/gestion-personal/estudiante/boleta-interes/items/${itemId}/`, { method: "DELETE" });
}

export function reorderStudentInterestCareer(itemId, direction) {
  return request(`/gestion-personal/estudiante/boleta-interes/items/${itemId}/`, { method: "PATCH", body: { direction } });
}

export function sendStudentInterest() {
  return request("/gestion-personal/estudiante/boleta-interes/enviar/", { method: "POST" });
}

export function editStudentInterest() {
  return request("/gestion-personal/estudiante/boleta-interes/editar/", { method: "POST" });
}

export function downloadStudentInterestPdf() {
  return request("/import-export/export/boleta-interes/", {
    blob: true,
    blobErrorMessage: "No se pudo descargar la boleta de interés.",
  });
}

export function downloadStudentInterestExcel() {
  return request("/import-export/export/boleta-interes/excel/", {
    blob: true,
    blobErrorMessage: "No se pudo descargar la boleta de interés en Excel.",
  });
}

export function fetchStudentSolicitud() {
  return request("/gestion-personal/estudiante/boleta-solicitud/");
}

export function submitStudentSolicitud(planPlazas, confirmar = false, modificacion = false) {
  return request("/gestion-personal/estudiante/boleta-solicitud/", {
    method: "POST",
    body: { plan_plazas: planPlazas, confirmar, ...(modificacion ? { modificacion: true } : {}) },
  });
}

export function editStudentSolicitud() {
  return request("/gestion-personal/estudiante/boleta-solicitud/editar/", { method: "POST" });
}

export function downloadStudentSolicitudPdf() {
  return request("/import-export/export/boleta-solicitud/", {
    blob: true,
    blobErrorMessage: "No se pudo descargar la boleta de solicitud.",
  });
}

export function downloadStudentSolicitudExcel() {
  return request("/import-export/export/boleta-solicitud/excel/", {
    blob: true,
    blobErrorMessage: "No se pudo descargar la boleta de solicitud en Excel.",
  });
}

export function fetchStudentProfile() {
  return request("/gestion-personal/estudiante/perfil/");
}

export function updateStudentProfile(payload) {
  return request("/gestion-personal/estudiante/perfil/", { method: "PATCH", body: payload });
}

export function fetchStudentExamConfirmations() {
  return request("/gestion-personal/estudiante/confirmacion-pruebas/");
}

export function updateStudentExamConfirmation(id, confirmed) {
  return request("/gestion-personal/estudiante/confirmacion-pruebas/", {
    method: "POST",
    body: { id, confirmada: confirmed },
  });
}

export function fetchStudentOtorgamiento(anio) {
  return request("/gestion-personal/estudiante/otorgamiento/", { params: anio ? { anio } : undefined });
}
