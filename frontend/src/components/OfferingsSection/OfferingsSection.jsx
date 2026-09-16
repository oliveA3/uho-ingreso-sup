import { useState } from "react";
import { getCesDetails } from "../../data/cesDetails";
import Modal from "../Modals/Modal";
import SecondaryButton from "../Buttons/SecondaryButton";
import PrimaryButton from "../Buttons/PrimaryButton";
import styles from "./OfferingsSection.module.css";

export default function OfferingsSection({ items = [] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const visibleItems = items.slice(0, 3);
  const enrich = (item) => ({ ...item, ...getCesDetails(item.nombre) });
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
          const item = enrich(rawItem);
          return (
          <article key={item.id} className={styles.card}>
            <h3 className={styles.cardTitle}>{item.nombre}</h3>
            <p className={styles.cardDescription}>{item.carreras_count} carreras en el plan de plazas {item.plan_year || ""}.</p>
            <p className={styles.cardMeta}>Sede principal: {item.sedePrincipal}</p>
          </article>
          );
        })}
      </div>
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Centros de Educación Superior"
        description="Catálogo público"
        size="lg"
      >
        <div className={styles.modalGrid}>
          {items.map((rawItem) => {
            const item = enrich(rawItem);
            return (
              <article key={item.id} className={styles.modalCard}>
                <h3 className={styles.modalCardTitle}>{item.nombre}</h3>
                <p className={styles.modalCardDescription}>{item.description}</p>
                <dl className={styles.modalCardDetails}>
                  <div><dt className={styles.detailTerm}>Carreras en el plan {item.plan_year || ""}: </dt><dd>{item.carreras_count}</dd></div>
                  <div><dt className={styles.detailTerm}>Sede principal: </dt><dd>{item.sedePrincipal}</dd></div>
                  <div><dt className={styles.detailTerm}>Sedes: </dt><dd>{item.sedes}</dd></div>
                </dl>
                {item.website && (
                  <PrimaryButton as="a" href={item.website} target="_blank" rel="noreferrer" className={styles.visitLink}>
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
