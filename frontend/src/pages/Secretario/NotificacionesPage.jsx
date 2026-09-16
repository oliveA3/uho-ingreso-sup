import { useEffect, useState } from "react";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import { fetchNotifications, markNotificationAsRead } from "../../services/api";
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
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700">Cuenta</p>
      <h1 className="mt-2 text-3xl font-semibold text-slate-900">Notificaciones</h1>
      <p className="mt-3 text-sm text-slate-600">Consulta los avisos de tu cuenta.</p>
      {error && <FeedbackMessage type="error" className="mt-5 rounded-xl">{error}</FeedbackMessage>}
      <div className="mt-6 space-y-3">
        {!notifications.length && !error && <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">No tienes notificaciones.</p>}
        {notifications.map((notification) => (
          <button key={notification.id} type="button" onClick={() => readNotification(notification)} className={`${styles.notification} ${notification.leida ? styles.notificationRead : styles.notificationUnread}`}>
            <p className="font-semibold text-slate-800">{notification.titulo}</p>
            <p className="mt-1 text-sm text-slate-600">{notification.contenido}</p>
            <p className="mt-2 text-xs text-slate-500">{new Date(notification.fecha).toLocaleString("es-CU")}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
