import { Outlet } from "react-router-dom";

export default function SuperAdminLayout({ user, onLogout }) {
  const isSuperAdmin = String(user?.rol || user?.rol_label || "").toLowerCase().includes("super");

  if (!user) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm m-4">
        <h1 className="text-2xl font-semibold text-slate-900">Panel Super Administrador</h1>
        <p className="mt-4 text-sm text-slate-600">Inicia sesión para acceder a esta área.</p>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm m-4">
        <h1 className="text-2xl font-semibold text-slate-900">Acceso denegado</h1>
        <p className="mt-4 text-sm text-slate-600">Este panel está reservado para usuarios con rol Super Administrador.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <Outlet context={{ user }} />
      </div>
    </div>
  );
}
