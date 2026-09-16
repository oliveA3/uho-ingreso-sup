import { Outlet } from "react-router-dom";
import { Card } from "../../components";

export default function DirectorLayout({ user }) {
  if (!user) {
    return <Card className="m-4" padding="p-8">Inicia sesión para acceder a esta área.</Card>;
  }

  return (
    <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <Outlet />
      </div>
    </div>
  );
}
