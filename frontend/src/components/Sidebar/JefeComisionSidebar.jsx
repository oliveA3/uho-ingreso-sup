import BaseSidebar from "./BaseSidebar";

export default function JefeComisionSidebar({ scope }) {
  const sections = [
    {
      title: "Proceso",
      items: [
        { label: "Dashboard", icon: "🏠", to: "/jefe_comision/dashboard" },
        { label: "Control Etapas", icon: "⚙️", to: "/jefe_comision/etapas" },
        { label: "Escalafones", icon: "📋", to: "/jefe_comision/escalafones" },
        { label: "Plan de Plazas", icon: "📊", to: "/jefe_comision/plazas" },
        { label: "Solicitudes", icon: "📝", to: "/jefe_comision/solicitudes" },
        { label: "Resultados", icon: "🏆", to: "/jefe_comision/resultados" },
        { label: "Otorgamiento", icon: "🎓", to: "/jefe_comision/otorgamiento" },
        { label: "API REST", icon: "🔌", to: "/jefe_comision/api" },
        { label: "Logs Auditoría", icon: "📜", to: "/jefe_comision/logs" },
      ],
    },
    {
      title: "Conf.",
      items: [
        { label: "Catálogo Carreras", icon: "📚", to: "/jefe_comision/carreras" },
        { label: "Cerrar Sesión", icon: "🚪", to: "/" },
      ],
    },
  ];

  return (
    <BaseSidebar
      title="Panel Jefe Comisión"
      roleLabel="🏛️ Jefe Comisión"
      scope={scope}
      sections={sections}
    />
  );
}
