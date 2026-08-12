import { Outlet } from "react-router-dom";
import { SidebarSelector } from "../../components/Sidebar/SidebarSelector";

export default function SecretarioLayout({ user }) {
  if (!user) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm m-4">
        <h1 className="text-2xl font-semibold text-slate-900">Panel Secretario</h1>
        <p className="mt-4 text-sm text-slate-600">Inicia sesión para acceder a esta área.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <SidebarSelector user={user} />
        <div className="space-y-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
