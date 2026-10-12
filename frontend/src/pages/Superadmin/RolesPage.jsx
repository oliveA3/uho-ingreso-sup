import { Card, DataTable, PageHeader } from "../../components";
import styles from "./RolesPage.module.css";

const rolePermissions = [
  ["Gestionar Provincias", ["✅", "❌", "❌", "❌", "❌", "❌", "❌", "❌"]],
  ["Crear Usuarios", ["✅", "❌", "✅", "✅", "❌", "❌", "❌", "❌"]],
  ["Activar Etapas", ["✅", "✅", "❌", "❌", "❌", "❌", "❌", "❌"]],
  ["Importar Escalafón", ["✅", "✅", "✅", "✅", "❌", "✅", "❌", "❌"]],
  ["Aprobar Boletas", ["✅", "✅", "✅", "✅", "❌", "✅", "❌", "❌"]],
  ["Ver Reportes Escuela", ["✅", "✅", "✅", "✅", "✅", "✅", "❌", "❌"]],
  ["Ver Logs Auditoría", ["✅", "✅", "❌", "❌", "❌", "❌", "❌", "❌"]],
  ["Llenar Boleta Solicitud", ["❌", "❌", "❌", "❌", "❌", "❌", "✅", "❌"]],
  ["Modificar Índice (excep.)", ["✅", "✅", "❌", "❌", "❌", "❌", "❌", "❌"]],
  ["Gestionar API Keys", ["✅", "❌", "❌", "❌", "❌", "❌", "❌", "❌"]],
  ["Gestionar Noticias", ["❌", "✅", "❌", "❌", "❌", "❌", "❌", "✅"]],
];

const roleLabels = ["SuperAdmin", "Jefe Com.", "Repr.Prov", "Repr.Mun", "Director", "Secretario", "Estudiante", "Gestor Noticias"];

const columns = [
  { key: "permiso", header: "Permiso", className: styles.permissionCell, render: ([permission]) => permission },
  ...roleLabels.map((label, index) => ({
    key: label,
    header: label,
    className: styles.roleCell,
    render: ([, states]) => states[index],
  })),
];

export default function RolesPage() {
  return (
    <div className={styles.page}>
      <Card padding="p-6">
        <PageHeader
          title="Roles y Permisos"
          subtitle="Matriz de control de acceso. Los permisos se verifican en el servidor en cada petición."
        />
        <DataTable className={styles.table} maxHeight="tall" columns={columns} data={rolePermissions} getRowKey={([permission]) => permission} />
      </Card>
    </div>
  );
}
