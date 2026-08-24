import BaseSidebar from "./BaseSidebar";

export default function RepresentanteProvincialSidebar({ scope, onLogout }) {
  const sections = [
    {
      title: "Gestión",
      items: [
        { label: "Municipios y Escuelas", icon: "🗺️", to: "/repr_provincial/municipios" },
        { label: "Usuarios", icon: "👥", to: "/repr_provincial/usuarios" },
      ],
    },
    {
      title: "Cuenta",
      items: [{ label: "Cerrar Sesión", icon: "🚪", action: "logout" }],
    },
  ];

  return (
    <BaseSidebar
      title="Panel Repr. Provincial"
      roleLabel="🗺️ Repr. Provincial"
      scope={scope}
      sections={sections}
      onLogout={onLogout}
    />
  );
}
