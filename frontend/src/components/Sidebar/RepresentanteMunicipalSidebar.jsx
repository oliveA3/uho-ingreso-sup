import BaseSidebar from "./BaseSidebar";

export default function RepresentanteMunicipalSidebar({ scope, onLogout, activeStageLabel }) {
  const sections = [
    {
      title: "Gestión",
      items: [
        { label: "Escuelas", icon: "🏫", to: "/repr_municipal/escuelas" },
        { label: "Usuarios", icon: "👥", to: "/repr_municipal/usuarios" },
      ],
    },
    {
      title: "Cuenta",
      items: [{ label: "Cerrar Sesión", icon: "🚪", action: "logout" }],
    },
  ];

  return (
    <BaseSidebar
      title="Panel Repr. Municipal"
      roleLabel="🏘️ Repr. Municipal"
      scope={scope}
      sections={sections}
      onLogout={onLogout}
      activeStageLabel={activeStageLabel}
    />
  );
}
