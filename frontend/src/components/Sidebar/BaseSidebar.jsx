import { Link, useLocation } from "react-router-dom";

export default function BaseSidebar({ title, roleLabel, scope, sections, onLogout }) {
  const location = useLocation();
  const isItemActive = (item) => location.pathname === item.to
    || (!item.exact && location.pathname.startsWith(`${item.to}/`));

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
    </aside>
  );
}
