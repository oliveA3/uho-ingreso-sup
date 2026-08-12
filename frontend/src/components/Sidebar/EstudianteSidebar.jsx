import BaseSidebar from "./BaseSidebar";

export default function EstudianteSidebar({ scope }) {
  const sections = [
    {
      title: "Mi Información",
      items: [
        { label: "Boleta de Solicitud", icon: "📝", to: "/estudiante/boleta" },
        { label: "Resultados", icon: "📊", to: "/estudiante/resultados" },
      ],
    },
    {
      title: "Cuenta",
      items: [{ label: "Cerrar Sesión", icon: "🚪", to: "/" }],
    },
  ];

  return (
    <BaseSidebar
      title="Panel Estudiante"
      roleLabel="🎓 Estudiante"
      scope={scope}
      sections={sections}
    />
  );
}
