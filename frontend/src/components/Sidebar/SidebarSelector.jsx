import React from "react";
import SuperAdminSidebar from "./SuperAdminSidebar";
import EstudianteSidebar from "./EstudianteSidebar";
import JefeComisionSidebar from "./JefeComisionSidebar";
import RepresentanteProvincialSidebar from "./RepresentanteProvincialSidebar";
import RepresentanteMunicipalSidebar from "./RepresentanteMunicipalSidebar";
import SecretarioSidebar from "./SecretarioSidebar";

export function SidebarSelector({ user, onLogout }) {
  if (!user) return null;

  switch (String(user.rol).toLowerCase()) {
    case "superadmin":
      return React.createElement(SuperAdminSidebar, { scope: user.alcance, onLogout });
    case "estudiante":
      return React.createElement(EstudianteSidebar, { scope: user.alcance, onLogout });
    case "jefe_comision":
    case "jefe comisión":
    case "jefe comision":
      return React.createElement(JefeComisionSidebar, { scope: user.alcance, onLogout });
    case "repr_provincial":
    case "repr provincial":
    case "ingreso_provincial":
    case "ingreso provincial":
      return React.createElement(RepresentanteProvincialSidebar, { scope: user.alcance, onLogout });
    case "repr_municipal":
    case "repr municipal":
    case "ingreso_municipal":
    case "ingreso municipal":
      return React.createElement(RepresentanteMunicipalSidebar, { scope: user.alcance, onLogout });
    case "secretario":
      return React.createElement(SecretarioSidebar, { scope: user.alcance, onLogout });
    default:
      return null;
  }
}

export { SuperAdminSidebar, EstudianteSidebar, JefeComisionSidebar, RepresentanteProvincialSidebar };
