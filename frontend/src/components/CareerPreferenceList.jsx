export default function CareerPreferenceList({ items = [], renderActions, showQuantity = false }) {
  const orderedItems = [...items].sort((first, second) => first.prioridad - second.prioridad);

  return (
    <ol className="space-y-2">
      {orderedItems.map((item) => (
        <li key={item.id} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-semibold text-sky-700">
            {item.prioridad}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">{item.carrera_nombre || item.nombre}</p>
            <p className="text-xs text-slate-500">
              {item.ces_nombre || "CES no disponible"} · {item.provincia_nombre || "Provincia no disponible"}
              {showQuantity && item.cantidad_plazas != null ? ` · ${item.cantidad_plazas} plazas` : ""}
            </p>
          </div>
          {renderActions?.(item)}
        </li>
      ))}
    </ol>
  );
}