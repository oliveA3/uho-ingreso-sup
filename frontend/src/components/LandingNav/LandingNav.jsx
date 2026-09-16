import { useState } from "react";
import { Link } from "react-router-dom";
import AuthActions from "../AuthActions/AuthActions";
import styles from "./LandingNav.module.css";

const NAV_LINKS = [
  { href: "#cronograma", label: "Cronograma" },
  { href: "#noticias", label: "Noticias" },
  { href: "#cortes", label: "Índices Corte" },
  { href: "#ofertas", label: "Universidades" },
];

export default function LandingNav({ user, visualConfig, onLogout }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className={styles.nav}>
      <div className={styles.bar}>
        <div className={styles.brand}>
          <Link to="/" className={styles.brandLink}>
            {visualConfig?.logo_url ? <img src={visualConfig.logo_url} alt="Logo" className={styles.logo} /> : "🎓"}
            <span className={styles.brandName}>{visualConfig?.nombre_sistema || "IngresoSUP"}</span>
          </Link>
          <p className={styles.tagline}>
            Sistema de Ingreso a la Educación Superior
          </p>
        </div>

        <div className={styles.links}>
          {NAV_LINKS.map((item) => (
            <a key={item.href} href={item.href} className={styles.link}>
              {item.label}
            </a>
          ))}
        </div>

        <div className={styles.actions}>
          <AuthActions user={user} onLogout={onLogout} />
          <button
            type="button"
            className={styles.menuButton}
            onClick={() => setIsMobileMenuOpen((isOpen) => !isOpen)}
            aria-label={isMobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={isMobileMenuOpen}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              {isMobileMenuOpen ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className={styles.mobilePanel}>
          {NAV_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={styles.mobileLink}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {item.label}
            </a>
          ))}
        </div>
      )}
    </nav>
  );
}
