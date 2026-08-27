import { Outlet } from "react-router-dom";

export default function DirectorLayout({ user }) {
  if (!user) {
    return <div className="m-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">Inicia sesión para acceder a esta área.</div>;
  }

  return (
    <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <Outlet />
      </div>
    </div>
  );
}
