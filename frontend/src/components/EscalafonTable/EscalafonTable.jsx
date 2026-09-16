export default function EscalafonTable({ entries, current, search, onSearchChange }) {
  const visibleEntries = entries.filter((entry) =>
    `${entry.nombre} ${entry.apellidos} ${entry.ci}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-900">Escalafón completo</h2>
        <input
          value={search}
          onChange={onSearchChange}
          placeholder="Buscar por nombre o CI"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm sm:w-64"
        />
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-100">
            <tr>
              {["Posición", "CI", "Nombre", "10mo", "11mo", "12mo", "Índice general"].map((heading) => (
                <th key={heading} className="px-4 py-3">{heading}</th>
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
                  className={isCurrentStudent
                    ? "border border-sky-200 bg-gradient-to-r from-sky-100 via-sky-50 to-white shadow-sm ring-1 ring-sky-200"
                    : "border-t border-slate-200 hover:bg-slate-50"}
                >
                  <td className="px-4 py-3">
                    <span
                      className={isCurrentStudent
                        ? "inline-flex items-center rounded-full bg-sky-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm"
                        : "inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"}
                    >
                      {position}
                    </span>
                  </td>
                  <td className="px-4 py-3">{entry.ci}</td>
                  <td className="px-4 py-3">{entry.nombre} {entry.apellidos}</td>
                  <td className="px-4 py-3">{entry.indice_10 ?? "--"}</td>
                  <td className="px-4 py-3">{entry.indice_11 ?? "--"}</td>
                  <td className="px-4 py-3">{entry.indice_12 ?? "--"}</td>
                  <td className="px-4 py-3">{entry.indice_general ?? "--"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
