import { request } from "./httpClient";

export function fetchSuperAdminConfig() {
  return request("/superadmin/config/");
}

export function updateSuperAdminConfig(payload) {
  return request("/superadmin/config/", { method: "PUT", body: payload });
}
