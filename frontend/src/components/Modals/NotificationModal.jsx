import { useEffect, useState } from "react";
import Modal from "./Modal";
import { fetchNotifications, markNotificationAsRead } from "../../api/notifications.service";
import styles from "./NotificationModal.module.css";

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("es-CU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export default function NotificationModal({ onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchNotifications()
      .then((data) => setNotifications(data.notifications || []))
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  async function readNotification(notification) {
    if (notification.leida) return;
    try {
      await markNotificationAsRead(notification.id);
      setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, leida: true } : item));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function closeModal() {
    const unread = notifications.filter((notification) => !notification.leida);
    try {
      await Promise.all(unread.map((notification) => markNotificationAsRead(notification.id)));
    } catch (requestError) {
      setError(requestError.message);
      return;
    }
    onClose();
  }

  return (
    <Modal open onClose={closeModal} size="sm" title="Notificaciones">
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.list}>
        {loading && <p className={styles.status}>Cargando notificaciones...</p>}
        {!loading && !notifications.length && <p className={styles.status}>No tienes notificaciones.</p>}
        {notifications.map((notification) => (
          <button
            key={notification.id}
            type="button"
            onClick={() => readNotification(notification)}
            className={`${styles.item} ${notification.leida ? "" : styles.itemUnread}`}
          >
            <p className={styles.itemTitle}>{notification.titulo}</p>
            <p className={styles.itemBody}>{notification.contenido}</p>
            <p className={styles.itemDate}>{formatDate(notification.fecha)}</p>
          </button>
        ))}
      </div>
    </Modal>
  );
}
