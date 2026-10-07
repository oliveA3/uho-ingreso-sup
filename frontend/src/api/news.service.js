import { request } from "./httpClient";

export function fetchProvincialNews() {
  return request("/gestion-provincial/noticias/");
}

export function createProvincialNews(payload) {
  return request("/gestion-provincial/noticias/", { method: "POST", body: payload });
}

export function updateProvincialNews(id, payload) {
  return request(`/gestion-provincial/noticias/${id}/`, { method: "PATCH", body: payload });
}

export function deleteProvincialNews(id) {
  return request(`/gestion-provincial/noticias/${id}/`, { method: "DELETE" });
}

export function fetchNewsManagers() {
  return request("/gestion-provincial/gestores-noticias/");
}

export function createNewsManager(payload) {
  return request("/gestion-provincial/gestores-noticias/", { method: "POST", body: payload });
}

export function updateNewsManager(id, payload) {
  return request(`/gestion-provincial/gestores-noticias/${id}/`, { method: "PATCH", body: payload });
}

export function deleteNewsManager(id) {
  return request(`/gestion-provincial/gestores-noticias/${id}/`, { method: "DELETE" });
}
