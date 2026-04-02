import { stats } from '../../content/stats';

export function StatStrip() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-2xl border border-surface-border bg-surface-card/80 p-6 text-center backdrop-blur-sm transition hover:border-accent/30"
        >
          <p className="font-display text-3xl font-bold text-white sm:text-4xl">{s.value}</p>
          <p className="mt-1 text-sm text-zinc-500">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
