import styles from "./NewsSection.module.css";

export default function NewsSection({ items }) {
  return (
    <section id="noticias" className={styles.section}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Noticias</p>
          <h2 className={styles.title}>Actualizaciones del proceso de ingreso</h2>
        </div>
      </div>
      <div className={styles.grid}>
        {items.map((item) => (
          <article key={item.id} className={styles.card}>
            <div className={styles.mediaWrapper}>
              {item.mediaType === "imagen" ? (
                <img className={styles.mediaImage} src={item.mediaUrl} alt={item.title} />
              ) : (
                <div className={styles.mediaFallback}>{item.mediaType}</div>
              )}
            </div>
            <div className={styles.meta}>
              <span>{item.category}</span>
              <span>{item.date}</span>
            </div>
            <h3 className={styles.cardTitle}>{item.title}</h3>
            <p className={styles.description}>{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
