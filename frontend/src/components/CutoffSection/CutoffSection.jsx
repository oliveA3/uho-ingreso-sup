import SecondaryButton from "../Buttons/SecondaryButton";
import styles from "./CutoffSection.module.css";

export default function CutoffSection({ items, year, onViewMore }) {
  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div>
          <p id="cortes" className={styles.eyebrow}>Índices de corte</p>
          <h2 className={styles.title}>Más solicitadas {year ? `(${year})` : ""}</h2>
        </div>
        {onViewMore && <SecondaryButton className={styles.moreTop} onClick={onViewMore}>Ver más</SecondaryButton>}
      </div>
      <div className={styles.grid}>
        {items.map((item) => (
          <article key={item.id} className={styles.card}>
            <h3 className={styles.cardTitle}>{item.carrera || item.career}</h3>
            <p className={styles.cardIndex}>{item.index}</p>
          </article>
        ))}
      </div>
      {onViewMore && <SecondaryButton className={styles.moreBottom} onClick={onViewMore}>Ver más</SecondaryButton>}
    </section>
  );
}
