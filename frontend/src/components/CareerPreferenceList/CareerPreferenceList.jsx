import styles from "./CareerPreferenceList.module.css";

export default function CareerPreferenceList({ items = [], renderActions, showQuantity = false }) {
  const orderedItems = [...items].sort((first, second) => first.prioridad - second.prioridad);

  return (
    <ol className={styles.list}>
      {orderedItems.map((item) => (
        <li key={item.id} className={styles.item}>
          <span className={styles.badge}>
            {item.prioridad}
          </span>
          <div className={styles.details}>
            <p className={styles.name}>{item.carrera_nombre || item.nombre}</p>
            <p className={styles.meta}>
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
