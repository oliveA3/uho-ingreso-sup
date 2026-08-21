import BaseSidebar from "./BaseSidebar";

export default function SuperAdminSidebar({ scope }) {
  const sections = [
    {
      title: "Administración",
      items: [
        { label: "Dashboard", icon: "🏠", to: "/superadmin/dashboard" },
        { label: "Nomencladores", icon: "📚", to: "/superadmin/nomencladores" },
        { label: "Usuarios", icon: "👥", to: "/superadmin/usuarios" },
        { label: "Roles y Permisos", icon: "🔐", to: "/superadmin/roles" },
        { label: "Identidad Visual", icon: "🎨", to: "/superadmin/identidad" },
        { label: "Despliegue Docker", icon: "🐳", to: "/superadmin/despliegue" },
      ],
    },
    {
      title: "Cuenta",
      items: [{ label: "Cerrar Sesión", icon: "🚪", to: "/" }],
    },
  ];

  return (
    <BaseSidebar
      title="⚙️ Super Admin"
      scope={scope}
      sections={sections}
    />
  );
}
