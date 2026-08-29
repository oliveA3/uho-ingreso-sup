import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import NotificationModal from "../Modals/NotificationModal";
import { fetchNotifications } from "../../services/api";

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
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl p-5 shadow-sm">
      <div className="shrink-0 space-y-1">
        <div className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-900">
          {title}
        </div>
        {scope && (
          <div className="text-xs text-slate-500">
            Alcance: <span className="badge bg-slate-200">{scope}</span>
          </div>
        )}
      </div>

      <div className="sidebar-sections-scroll -mr-5 min-h-0 flex-1 overflow-y-auto pr-5">
        {sections.map((section) => (
          <div key={section.title}>
            <div className="pt-3 text-slate-500 uppercase tracking-[0.18em] text-xs">
              {section.title}
            </div>
            <nav className="mt-3 space-y-2 text-sm text-slate-600">
              {section.title === "Cuenta" && (
                <button type="button" onClick={() => setNotificationsOpen(true)} className="relative block w-full rounded-2xl px-4 py-3 text-left transition hover:bg-slate-100 hover:text-slate-900">
                  {unreadNotifications > 0 && <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-rose-500 align-middle" aria-label={`${unreadNotifications} notificaciones sin leer`} />}
                  🔔 Notificaciones
                </button>
              )}
              {section.items.map((item) => (
              item.action === "logout" ? (
                <button
                  key={item.label}
                  type="button"
                  onClick={onLogout}
                  className="block w-full rounded-2xl px-4 py-3 text-left transition hover:bg-slate-100 hover:text-slate-900"
                >
                  {item.icon} {item.label}
                </button>
              ) : item.disabled ? (
                <div
                  key={item.label}
                  title={item.disabledMessage}
                  aria-disabled="true"
                  className="block cursor-not-allowed rounded-2xl px-4 py-3 text-slate-400 opacity-70"
                >
                  {item.icon} {item.label}
                </div>
              ) : item.to ? (
                <Link
                  key={item.label}
                  to={item.to}
                  className={`block rounded-2xl px-4 py-3 transition hover:bg-slate-100 hover:text-slate-900 ${
                    isItemActive(item)
                      ? "bg-sky-100 font-semibold text-sky-800"
                      : ""
                  }`}
                >
                  {item.icon} {item.label}
                </Link>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  className="block rounded-2xl px-4 py-3 transition hover:bg-slate-100 hover:text-slate-900"
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
