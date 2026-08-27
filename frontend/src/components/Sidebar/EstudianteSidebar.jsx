import BaseSidebar from "./BaseSidebar";

export default function EstudianteSidebar({ scope, onLogout, activeStageLabel }) {
  const sections = [
    {
      title: "Mi Información",
      items: [
        { label: "Boleta de Solicitud", icon: "📝", to: "/estudiante/boleta" },
        { label: "Escalafón", icon: "📋", to: "/estudiante/escalafon" },
        { label: "Boleta de Interés", icon: "🎯", to: "/estudiante/boleta-interes" },
        { label: "Confirmación de Pruebas", icon: "✏️", to: "/estudiante/confirmacion-pruebas" },
        { label: "Resultados", icon: "📊", to: "/estudiante/resultados" },
        { label: "Mi Otorgamiento", icon: "🎓", to: "/estudiante/otorgamiento" },
      ],
    },
    {
      title: "Cuenta",
      items: [{ label: "Cerrar Sesión", icon: "🚪", action: "logout" }],
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
