import { useEffect, useState } from "react";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import { fetchNotifications, markNotificationAsRead } from "../../api/notifications.service";
import styles from "./NotificacionesPage.module.css";

export default function SecretarioNotificacionesPage() {
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchNotifications()
      .then((data) => setNotifications(data.notifications || []))
      .catch((requestError) => setError(requestError.message));
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

  return (
    <section className={styles.section}>
      <p className={styles.eyebrow}>Cuenta</p>
      <h1 className={styles.title}>Notificaciones</h1>
      <p className={styles.subtitle}>Consulta los avisos de tu cuenta.</p>
      {error && <FeedbackMessage type="error" className={styles.feedbackMessage}>{error}</FeedbackMessage>}
      <div className={styles.list}>
        {!notifications.length && !error && <p className={styles.emptyState}>No tienes notificaciones.</p>}
        {notifications.map((notification) => (
          <button key={notification.id} type="button" onClick={() => readNotification(notification)} className={`${styles.notification} ${notification.leida ? styles.notificationRead : styles.notificationUnread}`}>
            <p className={styles.notificationTitle}>{notification.titulo}</p>
            <p className={styles.notificationContent}>{notification.contenido}</p>
            <p className={styles.notificationDate}>{new Date(notification.fecha).toLocaleString("es-CU")}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
