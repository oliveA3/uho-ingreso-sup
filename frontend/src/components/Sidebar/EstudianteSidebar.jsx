import BaseSidebar from "./BaseSidebar";

export default function EstudianteSidebar({ scope, onLogout, activeStageLabel }) {
  const sections = [
    {
      title: "Mi Proceso",
      items: [
        { label: "Inicio", icon: "🏠", to: "/estudiante", exact: true },
        { label: "Escalafón", icon: "📋", to: "/estudiante/escalafon" },
        { label: "Boleta de Interés", icon: "🎯", to: "/estudiante/boleta-interes" },
        { label: "Boleta de Solicitud", icon: "📝", to: "/estudiante/boleta" },
        { label: "Confirmación de Pruebas", icon: "✏️", to: "/estudiante/confirmacion-pruebas" },
        { label: "Resultados", icon: "📊", to: "/estudiante/resultados" },
        { label: "Carrera Otorgada", icon: "🎓", to: "/estudiante/otorgamiento" },
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
      title="Panel Estudiante"
      roleLabel="🎓 Estudiante"
      scope={scope}
      sections={sections}
      onLogout={onLogout}
      activeStageLabel={activeStageLabel}
    />
  );
}
