import { request } from "./httpClient";

export function fetchNotifications() {
  return request("/core/notificaciones/");
}

export function markNotificationAsRead(id) {
  return request(`/core/notificaciones/${id}/leer/`, { method: "PATCH" });
}
