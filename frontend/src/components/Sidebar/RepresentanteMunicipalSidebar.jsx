import BaseSidebar from "./BaseSidebar";

export default function RepresentanteMunicipalSidebar({ scope }) {
  const sections = [
    {
      title: "Gestión",
      items: [
        { label: "Dashboard", icon: "🏠", to: "/repr_municipal/dashboard" },
        { label: "Usuarios", icon: "👥", to: "/repr_municipal/usuarios" },
      ],
    },
    {
      title: "Cuenta",
      items: [{ label: "Cerrar Sesión", icon: "🚪", to: "/" }],
    },
  ];

  return (
    <BaseSidebar
      title="Panel Repr. Municipal"
      roleLabel="🏘️ Repr. Municipal"
      scope={scope}
      sections={sections}
    />
  );
}
