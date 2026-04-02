import { NavLink } from 'react-router-dom';

const nav = [
  { to: '/', label: 'Home', end: true },
  { to: '/how-to-run', label: 'How to run' },
  { to: '/commands', label: 'Commands' }
];

export function SiteHeader() {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-surface-border/80 bg-surface/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <NavLink
          to="/"
          className="font-display text-lg font-semibold tracking-tight text-white transition hover:text-accent-bright"
        >
          Music bot
        </NavLink>
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main">
          {nav.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                [
                  'rounded-lg px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-accent-dim text-accent-bright'
                    : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
                ].join(' ')
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
