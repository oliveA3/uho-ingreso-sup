import { request, requestImport } from "./httpClient";

export function fetchResults(anio) {
  return request("/import-export/resultados/", { params: anio ? { anio } : undefined });
}

export function downloadResultsExport(anio, asignatura) {
  const params = { anio: String(anio) };
  if (asignatura) params.asignatura = asignatura;
  return request("/import-export/resultados/exportar/", {
    params,
    blob: true,
    blobErrorMessage: "No se pudieron exportar los resultados.",
  });
}

export function submitStudentResultClaim(resultId, descripcion) {
  return request(`/import-export/resultados/${resultId}/reclamar/`, { method: "POST", body: { descripcion } });
}

export function fetchResultClaims(anio) {
  return request("/import-export/resultados/reclamaciones/", { params: anio ? { anio } : undefined });
}

export function updateResultClaim(claimId, estado, details = {}) {
  return request(`/import-export/resultados/reclamaciones/${claimId}/`, {
    method: "PATCH",
    body: { estado, ...details },
  });
}

export function importResults(file, anio, asignatura, fechaLimiteReclamo) {
  const form = new FormData();
  form.append("file", file);
  form.append("anio", String(anio));
  form.append("asignatura", asignatura);
  form.append("fecha_limite_reclamo", fechaLimiteReclamo);
  return requestImport("/import-export/import/resultados/", form);
}

function importStageSixFile(path, file) {
  const form = new FormData();
  form.append("file", file);
  return requestImport(`/import-export/${path}/`, form);
}

export function importOtorgamientos(file) {
  return importStageSixFile("import/otorgamiento", file);
}

export function importCortesCarrera(file) {
  return importStageSixFile("import/cortes-carrera", file);
}

export function fetchOtorgamientoSummary(anio) {
  return request("/import-export/otorgamiento/resumen/", { params: anio ? { anio } : undefined });
}

export function downloadStageSixExport(kind, anio) {
  return request(`/import-export/otorgamiento/exportar/${kind}/`, {
    params: anio ? { anio } : undefined,
    blob: true,
    blobErrorMessage: "No se pudo exportar la información.",
  });
}
