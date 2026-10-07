import BaseSidebar from "./BaseSidebar";

export default function GestorNoticiasSidebar({ scope, onLogout }) {
  const sections = [
    {
      title: "Gestión",
      items: [{ label: "Noticias", icon: "📰", to: "/gestor_noticias/noticias" }],
    },
    {
      title: "Cuenta",
      items: [{ label: "Cerrar Sesión", icon: "🚪", action: "logout" }],
    },
  ];

  return (
    <BaseSidebar
      title="Panel Gestor de Noticias"
      roleLabel="📰 Gestor Provincial de Noticias"
      scope={scope}
      sections={sections}
      onLogout={onLogout}
    />
  );
}
