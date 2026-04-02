import { Link } from 'react-router-dom';

export function SiteFooter() {
  return (
    <footer className="border-t border-surface-border bg-surface-raised/50 py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div>
          <p className="font-display text-sm font-semibold text-zinc-200">discord-bot</p>
          <p className="text-xs text-zinc-500">MIT License</p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-zinc-500">
          <Link to="/commands" className="hover:text-zinc-300">
            Commands
          </Link>
          <Link to="/how-to-run" className="hover:text-zinc-300">
            Setup
          </Link>
          <Link to="/" className="hover:text-zinc-300">
            Home
          </Link>
        </div>
      </div>
    </footer>
  );
}
