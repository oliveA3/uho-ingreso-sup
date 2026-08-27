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
            {visibleEntries.map((entry) => (
              <tr
                key={entry.id}
                className={entry.id === current.id ? "bg-sky-50 font-semibold" : "border-t border-slate-200"}
              >
                <td className="px-4 py-3">{entries.findIndex((item) => item.id === entry.id) + 1}</td>
                <td className="px-4 py-3">{entry.ci}</td>
                <td className="px-4 py-3">{entry.nombre} {entry.apellidos}</td>
                <td className="px-4 py-3">{entry.indice_10 ?? "--"}</td>
                <td className="px-4 py-3">{entry.indice_11 ?? "--"}</td>
                <td className="px-4 py-3">{entry.indice_12 ?? "--"}</td>
                <td className="px-4 py-3">{entry.indice_general ?? "--"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
