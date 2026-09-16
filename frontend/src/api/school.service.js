import { request } from "./httpClient";

export function fetchSchoolDashboard() {
  return request("/gestion-escuela/dashboard/");
}

export function fetchSchoolInterestMetrics() {
  return request("/gestion-escuela/boleta-interes/metricas/");
}

export function fetchSchoolSolicitudes() {
  return request("/gestion-escuela/boletas-solicitud/");
}

export function approveSchoolSolicitud(id) {
  return request(`/gestion-escuela/boletas-solicitud/${id}/aprobar/`, { method: "POST" });
}

export function downloadSchoolSolicitudPdf(id) {
  return request(`/import-export/export/boleta-solicitud/${id}/`, {
    blob: true,
    blobErrorMessage: "No se pudo descargar la boleta del estudiante.",
  });
}

export function fetchSchoolExamConfirmationMetrics() {
  return request("/gestion-escuela/confirmacion-pruebas/metricas/");
}

export function fetchSchoolOtorgamientos(anio) {
  return request("/import-export/otorgamiento/escuela/", { params: anio ? { anio } : undefined });
}

export function fetchStudentsWithoutAccount() {
  return request("/gestion-escuela/estudiantes/sin-cuenta/");
}
