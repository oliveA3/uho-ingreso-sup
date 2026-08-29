import { useEffect, useState } from "react";
import { fetchNotifications, markNotificationAsRead } from "../../services/api";

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
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 pt-20" onClick={closeModal}>
      <section className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Notificaciones</h2>
          <button type="button" onClick={closeModal} className="text-xl text-slate-500" aria-label="Cerrar">&times;</button>
        </div>
        {error && <p className="mt-3 rounded-xl bg-rose-50 p-2 text-xs text-rose-700">{error}</p>}
        <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
          {loading && <p className="text-sm text-slate-500">Cargando notificaciones...</p>}
          {!loading && !notifications.length && <p className="text-sm text-slate-500">No tienes notificaciones.</p>}
          {notifications.map((notification) => (
            <button key={notification.id} type="button" onClick={() => readNotification(notification)} className={`block w-full rounded-xl border p-3 text-left transition hover:bg-slate-50 ${notification.leida ? "border-slate-200 bg-white" : "border-sky-200 bg-sky-50"}`}>
              <p className="text-sm font-semibold text-slate-800">{notification.titulo}</p>
              <p className="mt-1 text-xs text-slate-600">{notification.contenido}</p>
              <p className="mt-2 text-[11px] text-slate-500">{formatDate(notification.fecha)}</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
