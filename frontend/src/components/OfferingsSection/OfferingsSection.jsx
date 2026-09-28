import { useMemo, useState } from "react";
import Modal from "../Modals/Modal";
import SecondaryButton from "../Buttons/SecondaryButton";
import PrimaryButton from "../Buttons/PrimaryButton";
import Input from "../Input/Input";
import styles from "./OfferingsSection.module.css";

const normalize = (value) => String(value || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export default function OfferingsSection({ items = [] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const visibleItems = items.slice(0, 3);
  const filteredItems = useMemo(() => {
    const needle = normalize(query.trim());
    return needle ? items.filter((item) => normalize(item.nombre).includes(needle)) : items;
  }, [items, query]);
  const closeModal = () => {
    setModalOpen(false);
    setQuery("");
  };
  return (
    <section id="ofertas" className={styles.section}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Centros de Educación Superior</p>
          <h2 className={styles.title}>Instituciones del proceso de ingreso</h2>
        </div>
        {items.length > 3 && <SecondaryButton onClick={() => setModalOpen(true)}>Ver más</SecondaryButton>}
      </div>
      <div className={styles.grid}>
        {visibleItems.map((rawItem) => {
          const item = rawItem;
          return (
          <article key={item.id} className={styles.card}>
            <h3 className={styles.cardTitle}>{item.nombre}</h3>
            <p className={styles.cardDescription}>{item.carreras_count} carreras en el plan de plazas {item.plan_year || ""}.</p>
            {item.sede_principal && <p className={styles.cardMeta}>Sede principal: {item.sede_principal}</p>}
          </article>
          );
        })}
      </div>
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="Centros de Educación Superior"
        description="Catálogo público"
        size="lg"
      >
        <div className={styles.searchRow}>
          <label className="sr-only" htmlFor="ces-search">Buscar universidad por nombre</label>
          <Input
            id="ces-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar universidad por nombre..."
            autoComplete="off"
          />
        </div>
        {filteredItems.length === 0 && <p className={styles.emptyResults} role="status">No hay universidades que coincidan con "{query}".</p>}
        <div className={styles.modalGrid}>
          {filteredItems.map((rawItem) => {
            const item = rawItem;
            return (
              <article key={item.id} className={styles.modalCard}>
                <h3 className={styles.modalCardTitle}>{item.nombre}</h3>
                {item.descripcion && <p className={styles.modalCardDescription}>{item.descripcion}</p>}
                <dl className={styles.modalCardDetails}>
                  <div><dt className={styles.detailTerm}>Carreras en el plan {item.plan_year || ""}: </dt><dd>{item.carreras_count}</dd></div>
                  {item.sede_principal && <div><dt className={styles.detailTerm}>Sede principal: </dt><dd>{item.sede_principal}</dd></div>}
                </dl>
                {item.sitio_web && (
                  <PrimaryButton as="a" href={item.sitio_web} target="_blank" rel="noreferrer" className={styles.visitLink}>
                    Visitar sitio oficial <span aria-hidden="true">↗</span>
                  </PrimaryButton>
                )}
              </article>
            );
          })}
        </div>
      </Modal>
    </section>
  );
}
