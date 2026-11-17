import Input from "../Input/Input";
import styles from "./EscalafonTable.module.css";

// El escalafon se muestra como ranking: posicion, nombre e indice general. Los
// datos personales (CI, direccion, indices por grado) solo llegan del backend
// para la fila del propio estudiante, y ya se muestran en las tarjetas de
// arriba, asi que la tabla no los repite.
export default function EscalafonTable({ entries, current, search, onSearchChange }) {
  const term = search.trim().toLowerCase();
  const visibleEntries = entries.filter((entry) =>
    !term || `${entry.nombre} ${entry.apellidos}`.toLowerCase().includes(term)
  );

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <h2 className={styles.heading}>Escalafón completo</h2>
        <Input
          value={search}
          onChange={onSearchChange}
          placeholder="Buscar por nombre"
          className={styles.searchInput}
        />
      </div>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead className={styles.thead}>
            <tr>
              {["Posición", "Nombre", "Índice general"].map((heading) => (
                <th key={heading} className={styles.th}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleEntries.map((entry) => {
              const isCurrentStudent = entry.id === current.id;

              return (
                <tr
                  key={entry.id}
                  className={isCurrentStudent ? styles.rowHighlight : styles.rowNormal}
                >
                  <td className={styles.td}>
                    <span className={isCurrentStudent ? styles.positionBadgeActive : styles.positionBadge}>
                      {entry.posicion}
                    </span>
                  </td>
                  <td className={styles.td}>
                    {entry.nombre} {entry.apellidos}
                    {isCurrentStudent && <span className={styles.youTag}> (tú)</span>}
                  </td>
                  <td className={styles.td}>{entry.indice_general ?? "--"}</td>
                </tr>
              );
            })}
            {!visibleEntries.length && (
              <tr className={styles.rowNormal}>
                <td className={styles.td} colSpan={3}>No hay estudiantes que coincidan con la búsqueda.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
