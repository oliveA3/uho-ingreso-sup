import { Outlet } from "react-router-dom";
import { Card } from "../../components";

export default function EstudianteLayout({ user, onLogout }) {
  if (!user) {
    return (
      <Card className="m-4" padding="p-8">
        <h1 className="text-2xl font-semibold text-slate-900">Panel Estudiante</h1>
        <p className="mt-4 text-sm text-slate-600">Inicia sesión para acceder a esta área.</p>
      </Card>
    );
  }

  return (
    <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <Outlet />
      </div>
    </div>
  );
}
