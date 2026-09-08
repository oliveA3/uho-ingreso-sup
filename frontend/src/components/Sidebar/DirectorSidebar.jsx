import BaseSidebar from "./BaseSidebar";

export default function DirectorSidebar({ scope, onLogout, activeStageLabel }) {
  const sections = [
    {
      title: "Gestión Escuela",
      items: [
        { label: "Dashboard", icon: "🏠", to: "/director/dashboard" },
        { label: "Sin Cuenta", icon: "👥", to: "/director/sincuenta" },
        { label: "Boletas de Interés", icon: "🎯", to: "/director/boleta-interes" },
        { label: "Boletas Solicitud", icon: "📝", to: "/director/boletas-solicitud" },
        { label: "Confirmación Pruebas", icon: "✏️", to: "/director/confirmacion-pruebas" },
        { label: "Resultados", icon: "🏆", to: "/director/resultados" },
        { label: "Otorgamientos", icon: "🎓", to: "/director/otorgamientos" },
      ],
    },
    {
      title: "Cuenta",
      items: [{ label: "Cerrar Sesión", icon: "🚪", action: "logout" }],
    },
  ];

  return (
    <BaseSidebar
      title="Panel Director"
      roleLabel="🏫 Director"
      scope={scope}
      sections={sections}
      onLogout={onLogout}
      activeStageLabel={activeStageLabel}
    />
  );
}
