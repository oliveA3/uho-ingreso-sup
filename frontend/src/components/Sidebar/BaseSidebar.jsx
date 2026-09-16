import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import NotificationModal from "../Modals/NotificationModal";
import { fetchNotifications } from "../../services/api";
import styles from "./BaseSidebar.module.css";

export default function BaseSidebar({ title, roleLabel, scope, sections, onLogout }) {
  const location = useLocation();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const isItemActive = (item) => location.pathname === item.to
    || (!item.exact && location.pathname.startsWith(`${item.to}/`));

  const refreshUnreadNotifications = () => {
    fetchNotifications()
      .then((data) => setUnreadNotifications((data.notifications || []).filter((notification) => !notification.leida).length))
      .catch(() => setUnreadNotifications(0));
  };

  useEffect(() => {
    refreshUnreadNotifications();
  }, []);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.title}>
          {title}
        </div>
        {scope && (
          <div className={styles.scope}>
            Alcance: <span className={styles.scopeBadge}>{scope}</span>
          </div>
        )}
      </div>

      <div className={styles.sections}>
        {sections.map((section) => (
          <div key={section.title}>
            <div className={styles.sectionTitle}>
              {section.title}
            </div>
            <nav className={styles.nav}>
              {section.title === "Cuenta" && (
                <button type="button" onClick={() => setNotificationsOpen(true)} className={styles.navButton}>
                  {unreadNotifications > 0 && <span className={styles.unreadDot} aria-label={`${unreadNotifications} notificaciones sin leer`} />}
                  🔔 Notificaciones
                </button>
              )}
              {section.items.map((item) => (
              item.action === "logout" ? (
                <button
                  key={item.label}
                  type="button"
                  onClick={onLogout}
                  className={styles.navButton}
                >
                  {item.icon} {item.label}
                </button>
              ) : item.disabled ? (
                <div
                  key={item.label}
                  title={item.disabledMessage}
                  aria-disabled="true"
                  className={styles.navDisabled}
                >
                  {item.icon} {item.label}
                </div>
              ) : item.to ? (
                <Link
                  key={item.label}
                  to={item.to}
                  className={`${styles.navLink} ${isItemActive(item) ? styles.navLinkActive : ""}`}
                >
                  {item.icon} {item.label}
                </Link>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  className={styles.navLink}
                >
                  {item.icon} {item.label}
                </a>
              )
              ))}
            </nav>
          </div>
        ))}
      </div>
      {notificationsOpen && <NotificationModal onClose={() => { setNotificationsOpen(false); refreshUnreadNotifications(); }} />}
    </aside>
  );
}
