import React from "react";
import SuperAdminSidebar from "./SuperAdminSidebar";
import EstudianteSidebar from "./EstudianteSidebar";
import JefeComisionSidebar from "./JefeComisionSidebar";
import RepresentanteProvincialSidebar from "./RepresentanteProvincialSidebar";
import RepresentanteMunicipalSidebar from "./RepresentanteMunicipalSidebar";
import SecretarioSidebar from "./SecretarioSidebar";

export function SidebarSelector({ user }) {
  if (!user) return null;

  switch (String(user.rol).toLowerCase()) {
    case "superadmin":
      return React.createElement(SuperAdminSidebar, { scope: user.alcance });
    case "estudiante":
      return React.createElement(EstudianteSidebar, { scope: user.alcance });
    case "jefe_comision":
    case "jefe comisión":
    case "jefe comision":
      return React.createElement(JefeComisionSidebar, { scope: user.alcance });
    case "repr_provincial":
    case "repr provincial":
      return React.createElement(RepresentanteProvincialSidebar, { scope: user.alcance });
    case "repr_municipal":
    case "repr municipal":
      return React.createElement(RepresentanteMunicipalSidebar, { scope: user.alcance });
    case "secretario":
      return React.createElement(SecretarioSidebar, { scope: user.alcance });
    default:
      return null;
  }
}

export { SuperAdminSidebar, EstudianteSidebar, JefeComisionSidebar, RepresentanteProvincialSidebar };
