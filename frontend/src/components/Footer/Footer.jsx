import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.content}>
        <p>IngresoSUP © 2026. Sistema de gestión para el ingreso a la Educación Superior en Cuba.</p>
      </div>
    </footer>
  );
}
