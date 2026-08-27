import React from "react";
import SuperAdminSidebar from "./SuperAdminSidebar";
import EstudianteSidebar from "./EstudianteSidebar";
import JefeComisionSidebar from "./JefeComisionSidebar";
import RepresentanteProvincialSidebar from "./RepresentanteProvincialSidebar";
import RepresentanteMunicipalSidebar from "./RepresentanteMunicipalSidebar";
import SecretarioSidebar from "./SecretarioSidebar";
import DirectorSidebar from "./DirectorSidebar";

export function SidebarSelector({ user, onLogout }) {
  if (!user) return null;

  const sidebarProps = { scope: user.alcance, onLogout };

  switch (String(user.rol).toLowerCase()) {
    case "superadmin":
      return React.createElement(SuperAdminSidebar, sidebarProps);
    case "estudiante":
      return React.createElement(EstudianteSidebar, sidebarProps);
    case "jefe_comision":
    case "jefe comisión":
    case "jefe comision":
      return React.createElement(JefeComisionSidebar, sidebarProps);
    case "repr_provincial":
    case "repr provincial":
    case "ingreso_provincial":
    case "ingreso provincial":
      return React.createElement(RepresentanteProvincialSidebar, sidebarProps);
    case "repr_municipal":
    case "repr municipal":
    case "ingreso_municipal":
    case "ingreso municipal":
      return React.createElement(RepresentanteMunicipalSidebar, sidebarProps);
    case "secretario":
    case "secretario_escuela":
      return React.createElement(SecretarioSidebar, sidebarProps);
    case "director_escuela":
      return React.createElement(DirectorSidebar, sidebarProps);
    default:
      return null;
  }
}

export { SuperAdminSidebar, EstudianteSidebar, JefeComisionSidebar, RepresentanteProvincialSidebar };
