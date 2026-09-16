import SecondaryButton from "../Buttons/SecondaryButton";
import styles from "./CutoffSection.module.css";

export default function CutoffSection({ items, year, onViewMore }) {
  return (
    <section id="cortes" className={styles.section}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Índices de corte</p>
          <h2 className={styles.title}>Más solicitadas {year ? `(${year})` : ""}</h2>
        </div>
        {onViewMore && <SecondaryButton onClick={onViewMore}>Ver más</SecondaryButton>}
      </div>
      <div className={styles.grid}>
        {items.map((item) => (
          <article key={item.id} className={styles.card}>
            <p className={styles.cardYear}>{item.year}</p>
            <h3 className={styles.cardTitle}>{item.carrera || item.career}</h3>
            <p className={styles.cardIndex}>{item.index}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
