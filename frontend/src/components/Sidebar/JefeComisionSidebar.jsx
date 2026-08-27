import BaseSidebar from "./BaseSidebar";

export default function JefeComisionSidebar({ scope, onLogout, activeStageLabel }) {
  const sections = [
    {
      title: "Proceso",
      items: [
        { label: "Dashboard", icon: "🏠", to: "/jefe_comision/dashboard" },
        { label: "Control de Etapas", icon: "⚙️", to: "/jefe_comision/etapas" },
        { label: "Catálogo de Carreras", icon: "📚", to: "/jefe_comision/carreras" },
        {
          label: "Escalafones",
          icon: "📋",
          to: "/jefe_comision/escalafones",
        },
        { label: "Plan de Plazas", icon: "📊", to: "/jefe_comision/plazas" },
        { label: "Solicitudes", icon: "📝", to: "/jefe_comision/solicitudes" },
        { label: "Resultados", icon: "🏆", to: "/jefe_comision/resultados" },
        { label: "Otorgamiento", icon: "🎓", to: "/jefe_comision/otorgamiento" },
        { label: "Documentación API REST", icon: "🔌", to: "/jefe_comision/api" },
        { label: "Registros", icon: "📜", to: "/jefe_comision/logs" },
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
      title="Panel Jefe Comisión"
      roleLabel="🏛️ Jefe Comisión"
      scope={scope}
      sections={sections}
      onLogout={onLogout}
      activeStageLabel={activeStageLabel}
    />
  );
}
