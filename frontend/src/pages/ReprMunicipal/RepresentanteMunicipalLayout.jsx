import { Outlet } from "react-router-dom";
import RequireRole from "../../components/RequireRole/RequireRole";

export default function RepresentanteMunicipalLayout({ user, onLogout }) {
  return (
    <RequireRole user={user} allow={["repr_municipal"]} panelTitle="Panel Repr. Municipal">
      <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <Outlet />
        </div>
      </div>
    </RequireRole>
  );
}
