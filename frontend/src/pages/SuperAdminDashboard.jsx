import React from 'react'
import { useNavigate } from "react-router-dom"
import { SidebarSelector } from '../components/Sidebar'

export default function SuperAdminDashboard({ user }) {
  const isSuperAdmin = String(user?.rol || user?.rol_label || "").toLowerCase().includes("super")
  const navigate = useNavigate()

  if (!user) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Panel Super Administrador</h1>
        <p className="mt-4 text-sm text-slate-600">Tienes que iniciar sesión para acceder a este panel.</p>
      </div>
    )
  }

  if (!isSuperAdmin) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Acceso denegado</h1>
        <p className="mt-4 text-sm text-slate-600">Este panel está reservado para usuarios con rol Super Administrador.</p>
      </div>
    )
  }

  const nomencladores = [
    { emoji: "🗺️", title: "Provincias", subtitle: "15 registros" },
    { emoji: "🏘️", title: "Municipios", subtitle: "168 registros" },
    { emoji: "🏫", title: "Escuelas", subtitle: "87 registros" },
    { emoji: "🎓", title: "Carreras", subtitle: "120 registros" },
    { emoji: "🏛️", title: "CES / Univ.", subtitle: "8 registros" },
    { emoji: "📐", title: "Asignaturas", subtitle: "3 registros" },
  ]

  const rolePermissions = [
    ["Gestionar Provincias", ["✅", "❌", "❌", "❌", "❌", "❌", "❌"]],
    ["Crear Usuarios", ["✅", "❌", "✅", "✅", "❌", "❌", "❌"]],
    ["Activar Etapas", ["✅", "✅", "❌", "❌", "❌", "❌", "❌"]],
    ["Importar Escalafón", ["✅", "✅", "✅", "✅", "❌", "✅", "❌"]],
    ["Aprobar Boletas", ["✅", "✅", "✅", "✅", "❌", "✅", "❌"]],
    ["Ver Reportes Escuela", ["✅", "✅", "✅", "✅", "✅", "✅", "❌"]],
    ["Ver Logs Auditoría", ["✅", "✅", "❌", "❌", "❌", "❌", "❌"]],
    ["Llenar Boleta Solicitud", ["❌", "❌", "❌", "❌", "❌", "❌", "✅"]],
    ["Modificar Índice (excep.)", ["✅", "✅", "❌", "❌", "❌", "❌", "❌"]],
    ["Gestionar API Keys", ["✅", "❌", "❌", "❌", "❌", "❌", "❌"]],
  ]

  const users = [
    { username: "r.linares", name: "Dr. Roberto Linares", role: "Jefe Comisión", scope: "Holguín", status: "Activo" },
    { username: "m.infante", name: "Lic. Marta Infante", role: "Repr. Prov.", scope: "Holguín", status: "Activo" },
    { username: "caridad.rodriguez", name: "Caridad Rodríguez", role: "Secretario", scope: "IPVCE F. Engels", status: "Activo" },
  ]

  const dockerServices = [
    ["app", "php:8.3-fpm / node:20", "8000", "Servidor de aplicación principal"],
    ["db", "postgres:16-alpine", "5432", "Base de datos PostgreSQL"],
    ["redis", "redis:7-alpine", "6379", "Caché y cola de notificaciones"],
    ["worker", "(misma app)", "—", "Procesador de colas (emails masivos)"],
    ["mailhog", "mailhog/mailhog", "8025", "SMTP local para desarrollo"],
  ]

  const colors = [
    { color: "#1F4E79", label: "Primario" },
    { color: "#2E75B6", label: "Secundario" },
    { color: "#5BA3D9", label: "Acento" },
    { color: "#D6E4F0", label: "Fondo", border: true },
    { color: "#1A7A4A", label: "Éxito" },
    { color: "#C0392B", label: "Error" },
  ]

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">Super Admin</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Panel de Administración Global</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-600">IngresoSUP · Configuración y gestión del sistema.</p>
        </div>
        <div className="rounded-3xl bg-slate-50 px-5 py-4 text-sm text-slate-700">
          <p className="font-semibold">Usuario</p>
          <p>{user.first_name || user.nombre || user.username} {user.last_name || user.apellidos || ""}</p>
          <p className="text-slate-500">{user.rol_label || user.rol}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <SidebarSelector user={user} />

        <div className="space-y-6">
          <section id="dashboard" className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Panel de Administración Global</h2>
                <p className="mt-2 text-sm text-slate-600">Accede a métricas del sistema y a los módulos de gestión.</p>
              </div>
              <div className="rounded-3xl bg-slate-50 px-5 py-4 text-sm text-slate-700">
                <p className="font-semibold">Alcance</p>
                <p>Acceso Global</p>
              </div>
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { value: "2", label: "Provincias Activas" },
                { value: "7", label: "Roles Definidos" },
                { value: "312", label: "Usuarios Totales" },
                { value: "v2.0", label: "Versión" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                  <p className="text-3xl font-semibold text-slate-900">{stat.value}</p>
                  <p className="mt-2 text-sm text-slate-600">{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700">
              ⚙️ Acceso total. Gestiona nomencladores, roles, usuarios, identidad visual y configuración de despliegue.
            </div>
          </section>

          <section id="nomencladores" className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">📚 Gestión de Nomencladores</h2>
                <p className="mt-2 text-sm text-slate-600">Todos los catálogos del sistema con CRUD completo.</p>
              </div>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
              >
                Ver catálogo
              </button>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {nomencladores.map((item) => (
                <div key={item.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center">
                  <div className="text-3xl">{item.emoji}</div>
                  <div className="mt-4 text-sm font-semibold text-slate-900">{item.title}</div>
                  <div className="mt-2 text-sm text-slate-600">{item.subtitle}</div>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700">
              ℹ️ Los nomencladores con registros asociados se desactivan (soft delete) para preservar integridad histórica.
            </div>
          </section>

          <section id="roles" className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">🔐 Roles y Permisos</h2>
                <p className="mt-2 text-sm text-slate-600">Matriz de control de acceso. Los permisos se verifican en el servidor en cada petición.</p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/roles")}
                className="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
              >
                Abrir roles
              </button>
            </div>
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100 text-left text-slate-700">
                    <th className="border-b border-slate-200 px-4 py-3">Permiso</th>
                    <th className="border-b border-slate-200 px-4 py-3">SuperAdmin</th>
                    <th className="border-b border-slate-200 px-4 py-3">Jefe Com.</th>
                    <th className="border-b border-slate-200 px-4 py-3">Repr.Prov</th>
                    <th className="border-b border-slate-200 px-4 py-3">Repr.Mun</th>
                    <th className="border-b border-slate-200 px-4 py-3">Director</th>
                    <th className="border-b border-slate-200 px-4 py-3">Secretario</th>
                    <th className="border-b border-slate-200 px-4 py-3">Estudiante</th>
                  </tr>
                </thead>
                <tbody>
                  {rolePermissions.map(([permission, states]) => (
                    <tr key={permission} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{permission}</td>
                      {states.map((state, index) => (
                        <td key={index} className="px-4 py-3 text-center text-slate-700">{state}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="usuarios" className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">👥 Gestión Global de Usuarios</h2>
                <p className="mt-2 text-sm text-slate-600">Todos los usuarios del sistema.</p>
              </div>
              <button type="button" className="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700">
                + Nuevo usuario
              </button>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                { label: "Rol", value: "Todos" },
                { label: "Provincia", value: "Todas" },
                { label: "Estado", value: "Todos" },
              ].map((filter) => (
                <label key={filter.label} className="space-y-2 text-sm text-slate-700">
                  {filter.label}
                  <select className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none">
                    <option>{filter.value}</option>
                  </select>
                </label>
              ))}
            </div>
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100 text-left text-slate-700">
                    <th className="border-b border-slate-200 px-4 py-3">Usuario</th>
                    <th className="border-b border-slate-200 px-4 py-3">Nombre</th>
                    <th className="border-b border-slate-200 px-4 py-3">Rol</th>
                    <th className="border-b border-slate-200 px-4 py-3">Alcance</th>
                    <th className="border-b border-slate-200 px-4 py-3">Estado</th>
                    <th className="border-b border-slate-200 px-4 py-3">Acc.</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((userRow) => (
                    <tr key={userRow.username} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-700">{userRow.username}</td>
                      <td className="px-4 py-3 text-slate-700">{userRow.name}</td>
                      <td className="px-4 py-3 text-slate-700"><span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">{userRow.role}</span></td>
                      <td className="px-4 py-3 text-slate-700">{userRow.scope}</td>
                      <td className="px-4 py-3 text-slate-700"><span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">{userRow.status}</span></td>
                      <td className="px-4 py-3 text-slate-700">
                        <button className="mr-2 inline-flex rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">✏️</button>
                        <button className="inline-flex rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">🔒</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="docker" className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">🐳 Despliegue Docker</h2>
                <p className="mt-2 text-sm text-slate-600">Entorno de desarrollo local reproducible.</p>
              </div>
              <div className="rounded-3xl bg-slate-50 px-5 py-4 text-sm text-slate-700">
                <p className="font-semibold">Referencia</p>
                <p>docker-compose.yml</p>
              </div>
            </div>
            <div className="mt-6 rounded-3xl bg-slate-950 p-6 text-sm text-slate-200 font-mono">
              <div className="text-slate-400 mb-4"># 1. Clonar repositorio (GitLab UHo o GitHub)</div>
              <div className="text-slate-100">git clone https://github.com/usuario/ingresoSUP.git &amp;&amp; cd ingresoSUP</div>
              <div className="mt-4 text-slate-400"># 2. Configurar variables de entorno</div>
              <div className="text-slate-100">cp .env.example .env</div>
              <div className="mt-4 text-slate-400"># 3. Levantar todos los servicios</div>
              <div className="text-slate-100">docker-compose up -d</div>
              <div className="mt-5 text-emerald-400">✅ App en http://localhost:8000</div>
              <div className="text-emerald-400">✅ API Docs en http://localhost:8000/api/docs</div>
              <div className="text-emerald-400">✅ Correo (dev) en http://localhost:8025 (MailHog)</div>
            </div>
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100 text-left text-slate-700">
                    <th className="border-b border-slate-200 px-4 py-3">Servicio</th>
                    <th className="border-b border-slate-200 px-4 py-3">Imagen</th>
                    <th className="border-b border-slate-200 px-4 py-3">Puerto</th>
                    <th className="border-b border-slate-200 px-4 py-3">Función</th>
                  </tr>
                </thead>
                <tbody>
                  {dockerServices.map(([service, image, port, purpose]) => (
                    <tr key={service} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{service}</td>
                      <td className="px-4 py-3 text-slate-700">{image}</td>
                      <td className="px-4 py-3 text-slate-700">{port}</td>
                      <td className="px-4 py-3 text-slate-700">{purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="identidad" className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">🎨 Identidad Visual Institucional</h2>
              <p className="mt-2 text-sm text-slate-600">Ajustada al manual de identidad del contexto MINED/MES.</p>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {colors.map((swatch) => (
                <div key={swatch.label} className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-center">
                  <div className={`mx-auto h-20 w-20 rounded-3xl ${swatch.border ? "border border-slate-300" : ""}`} style={{ background: swatch.color }} />
                  <p className="text-sm font-semibold text-slate-900">{swatch.label}</p>
                  <p className="text-xs text-slate-600">{swatch.color}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <label className="space-y-2 text-sm text-slate-700">
                Logo del Sistema (PNG/SVG)
                <input type="file" accept="image/*" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900" />
              </label>
              <label className="space-y-2 text-sm text-slate-700">
                Nombre del Sistema
                <input value="IngresoSUP" readOnly className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900" />
              </label>
              <label className="space-y-2 text-sm text-slate-700">
                Tipografía Principal
                <select className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">
                  <option>Segoe UI (recomendada)</option>
                  <option>Arial</option>
                  <option>Roboto</option>
                </select>
              </label>
            </div>
            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700">
              📋 El logo aparece en: cabecera Landing Page, pantalla de login y en todos los documentos exportados (boletas PDF, reportes, listados).
            </div>
            <button className="mt-4 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
              💾 Guardar Configuración
            </button>
          </section>
        </div>
      </div>
    </div>
  )
}
