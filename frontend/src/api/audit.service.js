import { request, resourceUrl } from "./httpClient";

export function fetchAuditLogs(filters = {}) {
  return request("/core/logs/", { params: filters });
}

export function getAuditLogExportUrl(format = "xlsx", filters = {}) {
  const suffix = format === "pdf" ? "pdf/" : "";
  return resourceUrl(`/core/logs/export/${suffix}`, filters);
}
