import Input from "../Input/Input";
import styles from "./EscalafonTable.module.css";

export default function EscalafonTable({ entries, current, search, onSearchChange }) {
  const visibleEntries = entries.filter((entry) =>
    `${entry.nombre} ${entry.apellidos} ${entry.ci}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <h2 className={styles.heading}>Escalafón completo</h2>
        <Input
          value={search}
          onChange={onSearchChange}
          placeholder="Buscar por nombre o CI"
          className={styles.searchInput}
        />
      </div>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead className={styles.thead}>
            <tr>
              {["Posición", "CI", "Nombre", "10mo", "11mo", "12mo", "Índice general"].map((heading) => (
                <th key={heading} className={styles.th}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleEntries.map((entry) => {
              const isCurrentStudent = entry.id === current.id;
              const position = entries.findIndex((item) => item.id === entry.id) + 1;

              return (
                <tr
                  key={entry.id}
                  className={isCurrentStudent ? styles.rowHighlight : styles.rowNormal}
                >
                  <td className={styles.td}>
                    <span className={isCurrentStudent ? styles.positionBadgeActive : styles.positionBadge}>
                      {position}
                    </span>
                  </td>
                  <td className={styles.td}>{entry.ci}</td>
                  <td className={styles.td}>{entry.nombre} {entry.apellidos}</td>
                  <td className={styles.td}>{entry.indice_10 ?? "--"}</td>
                  <td className={styles.td}>{entry.indice_11 ?? "--"}</td>
                  <td className={styles.td}>{entry.indice_12 ?? "--"}</td>
                  <td className={styles.td}>{entry.indice_general ?? "--"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
