import BaseSidebar from "./BaseSidebar";

export default function SecretarioSidebar({ scope, onLogout, activeStageLabel }) {
  const sections = [
    {
      title: "Gestión Escuela",
      items: [
        { label: "Dashboard", icon: "🏠", to: "/secretario/dashboard" },
        {
          label: "Escalafón",
          icon: "📥",
          to: "/secretario/escalafon",
        },
        { label: "Sin Cuenta", icon: "👥", to: "/secretario/sincuenta" },
        { label: "Boleta de Interés", icon: "🎯", to: "/secretario/boleta-interes" },
        { label: "Boletas Solicitud", icon: "📝", to: "/secretario/boletas-solicitud" },
        { label: "Confirmación Pruebas", icon: "✏️", to: "/secretario/confirmacion-pruebas" },
        { label: "Resultados", icon: "🏆", to: "/secretario/resultados" },
        { label: "Otorgamientos", icon: "🎓", to: "/secretario/otorgamientos" },
      ],
    },
    {
      title: "Cuenta",
      items: [
        { label: "Cerrar Sesión", icon: "🚪", action: "logout" },
      ],
    },
  ];

  return (
    <BaseSidebar
      title="Panel Secretario"
      roleLabel="📋 Secretario"
      scope={scope}
      sections={sections}
      onLogout={onLogout}
      activeStageLabel={activeStageLabel}
    />
  );
}
