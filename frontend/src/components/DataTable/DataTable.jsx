import styles from "./DataTable.module.css";

/**
 * Generic table shell shared across catalog/list pages, replacing the
 * hand-rolled <table> markup that used to be copy-pasted into every page.
 *
 * columns: [{ key, header, render?(row), className? }]
 */
export default function DataTable({
  columns,
  data = [],
  getRowKey = (row) => row.id,
  loading = false,
  emptyMessage = "No hay elementos para mostrar.",
  loadingMessage = "Cargando...",
  className = "",
  maxHeight,
}) {
  return (
    <div
      className={`${styles.wrapper} ${className}`}
      style={maxHeight ? { maxHeight, overflowY: "auto" } : undefined}
      aria-busy={loading || undefined}
    >
      <table className={styles.table}>
        <thead className={styles.thead}>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className={styles.th}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={styles.tbody}>
          {loading ? (
            <tr className={styles.statusRow}>
              <td colSpan={columns.length} className={styles.statusCell} role="status" aria-live="polite">
                {loadingMessage}
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr className={styles.statusRow}>
              <td colSpan={columns.length} className={styles.statusCell}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={getRowKey(row)} className={styles.tr}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    data-label={column.header}
                    className={`${styles.td} ${column.className || ""}`}
                  >
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
