import { Card, DataTable, PageHeader } from "../../components";

const rolePermissions = [
  ["Gestionar Provincias", ["✅", "❌", "❌", "❌", "❌", "❌", "❌"]],
  ["Crear Usuarios", ["✅", "❌", "✅", "✅", "❌", "❌", "❌"]],
  ["Activar Etapas", ["✅", "✅", "❌", "❌", "❌", "❌", "❌"]],
  ["Importar Escalafón", ["✅", "✅", "✅", "✅", "❌", "✅", "❌"]],
  ["Aprobar Boletas", ["✅", "✅", "✅", "✅", "❌", "✅", "❌"]],
  ["Ver Reportes Escuela", ["✅", "✅", "✅", "✅", "✅", "✅", "❌"]],
  ["Ver Logs Auditoría", ["✅", "✅", "❌", "❌", "❌", "❌", "❌"]],
  ["Llenar Boleta Solicitud", ["❌", "❌", "❌", "❌", "❌", "❌", "✅"]],
  ["Modificar Índice (excep.)", ["✅", "✅", "❌", "❌", "❌", "❌", "❌"]],
  ["Gestionar API Keys", ["✅", "❌", "❌", "❌", "❌", "❌", "❌"]],
];

const roleLabels = ["SuperAdmin", "Jefe Com.", "Repr.Prov", "Repr.Mun", "Director", "Secretario", "Estudiante"];

const columns = [
  { key: "permiso", header: "Permiso", className: "font-semibold text-slate-900", render: ([permission]) => permission },
  ...roleLabels.map((label, index) => ({
    key: label,
    header: label,
    className: "text-center text-slate-700",
    render: ([, states]) => states[index],
  })),
];

export default function RolesPage() {
  return (
    <div className="space-y-6">
      <Card padding="p-8">
        <PageHeader
          title="🔐 Roles y Permisos"
          subtitle="Matriz de control de acceso. Los permisos se verifican en el servidor en cada petición."
        />
        <DataTable className="table-scroll mt-6" columns={columns} data={rolePermissions} getRowKey={([permission]) => permission} />
      </Card>
    </div>
  );
}
