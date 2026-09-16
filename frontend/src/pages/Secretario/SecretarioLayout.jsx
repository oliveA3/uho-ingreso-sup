import { Outlet } from "react-router-dom";
import RequireRole from "../../components/RequireRole/RequireRole";

export default function SecretarioLayout({ user, onLogout }) {
  return (
    <RequireRole user={user} allow={["secretario"]} panelTitle="Panel Secretario">
      <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <Outlet />
        </div>
      </div>
    </RequireRole>
  );
}
