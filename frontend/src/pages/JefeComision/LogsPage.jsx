import { useEffect, useState } from "react";
import { fetchAuditLogs, getAuditLogExportUrl } from "../../services/api";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import PrimaryButton from "../../components/Buttons/PrimaryButton";
import SecondaryButton from "../../components/Buttons/SecondaryButton";
import { Card, DataTable, FormField, Input, Select } from "../../components";
import styles from "./LogsPage.module.css";

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ usuario: "", accion: "", modulo: "", fecha_desde: "", fecha_hasta: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAuditLogs(filters).then((data) => {
      setLogs(data.logs);
      setTotal(data.total ?? data.logs.length);
    }).catch((requestError) => setError(requestError.message));
  }, [filters]);

  function exportLogs(format) {
    window.open(getAuditLogExportUrl(format, filters), "_blank");
  }

  const columns = [
    { key: "fecha", header: "Fecha y hora", render: (log) => new Date(log.created_at).toLocaleString() },
    { key: "usuario", header: "Usuario", render: (log) => log.usuario_nombre },
    { key: "rol", header: "Rol", render: (log) => log.rol },
    { key: "modulo", header: "Módulo", render: (log) => log.modulo },
    { key: "accion", header: "Acción", render: (log) => log.accion },
    { key: "ip", header: "IP", render: (log) => log.ip },
  ];

  return (
    <div className={styles.page}>
      <Card padding="p-8">
        <div>
          <p className={styles.eyebrow}>Registros</p>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>Logs de Auditoría</h1>
            <span className={styles.countBadge}>{total.toLocaleString("es-ES")} registros</span>
          </div>
          <p className={styles.description}>Registro inmutable de todas las acciones del sistema.</p>
          {error && <FeedbackMessage type="error" className="mt-4 rounded-xl">{error}</FeedbackMessage>}
          <div className={styles.filtersGrid}>
            {[["usuario", "Usuario"], ["accion", "Acción"], ["fecha_desde", "Desde"], ["fecha_hasta", "Hasta"]].map(([field, label]) => (
              <FormField key={field} label={label}>
                <Input type={field.startsWith("fecha") ? "date" : "search"} value={filters[field]} onChange={(event) => setFilters({ ...filters, [field]: event.target.value })} />
              </FormField>
            ))}
            <FormField label="Módulo">
              <Select value={filters.modulo} onChange={(event) => setFilters({ ...filters, modulo: event.target.value })}>
                <option value="">Todos</option>
                <option value="authentication">Autenticación</option>
                <option value="gestion-provincial">Gestión provincial</option>
                <option value="gestion-municipal">Gestión municipal</option>
                <option value="gestion-escuela">Gestión escuela</option>
                <option value="gestion-personal">Gestión personal</option>
                <option value="superadmin">Super administración</option>
                <option value="import">Importaciones</option>
              </Select>
            </FormField>
          </div>
          <div className={styles.actionsRow}>
            <PrimaryButton className={styles.darkButton} onClick={() => exportLogs("xlsx")}>Exportar Excel</PrimaryButton>
            <SecondaryButton onClick={() => exportLogs("pdf")}>Exportar PDF</SecondaryButton>
          </div>
        </div>
      </Card>

      <Card padding="p-8">
        <DataTable
          className="table-scroll"
          columns={columns}
          data={logs}
          emptyMessage="No hay registros para los filtros seleccionados."
        />
      </Card>
    </div>
  );
}
