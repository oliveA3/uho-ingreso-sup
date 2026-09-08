export default function BallotMetrics({ items }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
          <p className={`mt-2 text-2xl font-semibold ${item.color || "text-slate-900"}`}>{item.value ?? 0}</p>
        </div>
      ))}
    </div>
  );
}
