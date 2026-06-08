import React, { useEffect, useState } from 'react'
import { useNavigate } from "react-router-dom";
import SuperAdminSidebar from '../components/SuperAdminSidebar'
import {
  fetchSuperAdminMetrics,
  fetchSuperAdminDashboard,
  fetchSuperAdminConfig,
  updateSuperAdminConfig,
  fetchNomencladoresHealth,
  fetchRoleAdmin,
} from "../services/api";


export default function SuperAdminDashboard({ user }) {
  const [metrics, setMetrics] = useState(null);
  const [config, setConfig] = useState({ logo_url: "", primary_color: "", secondary_color: "", accent_color: "" });
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [healthResult, setHealthResult] = useState(null);
  const [rolesCount, setRolesCount] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  const isSuperAdmin = user?.rol?.name?.toLowerCase() === "super administrador";

  useEffect(() => {
    if (!isSuperAdmin) {
      return;
    }

    async function loadData() {
      try {
        const [metricData, configData] = await Promise.all([
          fetchSuperAdminMetrics(),
          fetchSuperAdminConfig(),
        ]);
        setMetrics(metricData);
        setConfig(configData);
      } catch (err) {
        setError(err.message || "No se pudo cargar el panel de Super Administrador.");
      }
    }

    loadData();
  }, [isSuperAdmin]);

  const handleConfigChange = (field) => (event) => {
    setConfig((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleSaveConfig = async (event) => {
    event.preventDefault();
    setError(null);
    setStatusMessage(null);
    setIsSaving(true);

    try {
      const updated = await updateSuperAdminConfig(config);
      setConfig(updated);
      setStatusMessage("Configuración actualizada correctamente.");
    } catch (err) {
      setError(err.message || "No se pudo guardar la configuración.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCheckNomencladores = async () => {
    setError(null);
    setStatusMessage(null);
    setHealthResult(null);

    try {
      const data = await fetchNomencladoresHealth();
      setHealthResult(`Nomencladores activos: ${data.status}`);
    } catch (err) {
      setError(err.message || "No se pudo conectar con el servicio de nomencladores.");
    }
  };

  const handleFetchRoles = async () => {
    setError(null);
    setStatusMessage(null);

    try {
      const data = await fetchRoleAdmin();
      setRolesCount(data.roles?.length ?? 0);
      setStatusMessage("Roles cargados correctamente en el panel de administración.");
      navigate("/roles");
    } catch (err) {
      setError(err.message || "No se pudo cargar la información de roles.");
    }
  };

  if (!user) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Panel Super Administrador</h1>
        <p className="mt-4 text-sm text-slate-600">Tienes que iniciar sesión para acceder a este panel.</p>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Acceso denegado</h1>
        <p className="mt-4 text-sm text-slate-600">Este panel está reservado para usuarios con rol Super Administrador.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Navegación</h2>
          <nav className="mt-4 space-y-3 text-sm text-slate-600">
            <a href="#dashboard" className="block rounded-2xl px-3 py-2 transition hover:bg-slate-100 hover:text-slate-900">
              Dashboard
            </a>
            <a href="#nomencladores" className="block rounded-2xl px-3 py-2 transition hover:bg-slate-100 hover:text-slate-900">
              Nomencladores
            </a>
            <a href="#roles" className="block rounded-2xl px-3 py-2 transition hover:bg-slate-100 hover:text-slate-900">
              Roles y permisos
            </a>
            <a href="#configuracion" className="block rounded-2xl px-3 py-2 transition hover:bg-slate-100 hover:text-slate-900">
              Configuración visual
            </a>
            <a href="#reportes" className="block rounded-2xl px-3 py-2 transition hover:bg-slate-100 hover:text-slate-900">
              Reportes
            </a>
          </nav>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Enlace rápido</p>
          <button
            type="button"
            onClick={handleFetchRoles}
            className="mt-3 w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
          >
            Ir a roles
          </button>
        </div>
      </aside>

      <section className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">Super Administrador</p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900">Panel de control global</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Accede a métricas globales, gestión de nomencladores, administración de roles y configuración visual del sistema.
              </p>
            </div>
            <div className="rounded-3xl bg-slate-50 px-5 py-4 text-sm text-slate-700">
              <p className="font-semibold">Usuario</p>
              <p>{user.nombre} {user.apellidos}</p>
              <p className="text-slate-500">{user.rol?.name}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{error}</div>
        )}
        {statusMessage && (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-700">{statusMessage}</div>
        )}

        <div id="dashboard" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[
            {
              label: "Provincias activas",
              value: metrics?.active_provincias ?? "-",
              icon: "🗺️",
            },
            {
              label: "Municipios",
              value: metrics?.municipios ?? "-",
              icon: "🏘️",
            },
            {
              label: "Escuelas",
              value: metrics?.escuelas ?? "-",
              icon: "🏫",
            },
            {
              label: "Estudiantes registrados",
              value: metrics?.estudiantes ?? "-",
              icon: "🎓",
            },
            {
              label: "Carreras disponibles",
              value: metrics?.carreras ?? "-",
              icon: "📚",
            },
            {
              label: "Roles definidos",
              value: metrics?.roles ?? "-",
              icon: "🔐",
            },
          ].map((card) => (
            <article key={card.label} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{card.label}</p>
                  <p className="mt-4 text-3xl font-semibold text-slate-900">{card.value}</p>
                </div>
                <div className="rounded-2xl bg-slate-100 px-4 py-3 text-xl">{card.icon}</div>
              </div>
            </article>
          ))}
        </div>

        <article id="nomencladores" className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Gestión de nomencladores</h2>
              <p className="mt-2 text-sm text-slate-600">
                Controla provincias, municipios, escuelas y carreras desde los endpoints del backend.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCheckNomencladores}
              className="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              Ver estado nomencladores
            </button>
          </div>
          {healthResult && <p className="mt-4 text-sm text-slate-700">{healthResult}</p>}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <a
              href="/admin/"
              className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
            >
              CRUD provincias
            </a>
            <a
              href="/admin/"
              className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
            >
              CRUD municipios
            </a>
            <a
              href="/admin/"
              className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
            >
              CRUD escuelas
            </a>
            <a
              href="/admin/"
              className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
            >
              CRUD carreras
            </a>
          </div>
        </article>

        <article id="roles" className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Administración de roles</h2>
              <p className="mt-2 text-sm text-slate-600">
                Accede a la gestión RBAC y revisa permisos desde los endpoints REST existentes.
              </p>
            </div>
            <button
              type="button"
              onClick={handleFetchRoles}
              className="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              Abrir administración de roles
            </button>
          </div>
          {rolesCount !== null && (
            <p className="mt-4 text-sm text-slate-700">Roles disponibles: {rolesCount}</p>
          )}
        </article>

        <article id="configuracion" className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Configuración global e identidad visual</h2>
            <p className="mt-2 text-sm text-slate-600">
              Actualiza el logo y la paleta de colores del dashboard con los valores que verán todos los administradores.
            </p>
          </div>
          <form onSubmit={handleSaveConfig} className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-700">
              URL del logo
              <input
                type="url"
                value={config.logo_url}
                onChange={handleConfigChange("logo_url")}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none"
                placeholder="https://..."
              />
            </label>
            <label className="space-y-2 text-sm text-slate-700">
              Color primario
              <input
                type="text"
                value={config.primary_color}
                onChange={handleConfigChange("primary_color")}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none"
                placeholder="#0ea5e9"
              />
            </label>
            <label className="space-y-2 text-sm text-slate-700">
              Color secundario
              <input
                type="text"
                value={config.secondary_color}
                onChange={handleConfigChange("secondary_color")}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none"
                placeholder="#0284c7"
              />
            </label>
            <label className="space-y-2 text-sm text-slate-700">
              Color de acento
              <input
                type="text"
                value={config.accent_color}
                onChange={handleConfigChange("accent_color")}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none"
                placeholder="#14b8a6"
              />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Guardando..." : "Guardar configuración"}
              </button>
            </div>
          </form>
        </article>

        <article id="reportes" className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Reportes</h2>
              <p className="mt-2 text-sm text-slate-600">
                Accede a los reportes generales del sistema y prepara la administración de datos geográficos.
              </p>
            </div>
            <a
              href="/api/reportes/health/"
              className="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              Consultar reportes
            </a>
          </div>
        </article>
      </section>
    </div>
  );
}
