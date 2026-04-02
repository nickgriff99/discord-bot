import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';

export function HeroSection() {
  const reduce = useReducedMotion();

  return (
    <section className="relative pb-16 pt-4 sm:pb-24">
      <div className="mx-auto max-w-3xl text-center">
        <motion.p
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-card/60 px-3 py-1 text-xs font-medium uppercase tracking-widest text-zinc-500"
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Discord
        </motion.p>
        <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
          YouTube audio in voice channels, controlled with slash commands.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
          Queue, volume, skip/pause, and a docs site bundled under{' '}
          <code className="rounded bg-surface-card px-1.5 py-0.5 text-sm text-zinc-300">web/</code>{' '}
          (served when you run <code className="rounded bg-surface-card px-1.5 py-0.5 text-sm text-zinc-300">npm start</code>
          ).
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/how-to-run"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-accent-bright focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Setup
          </Link>
          <Link
            to="/commands"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-surface-border bg-surface-raised px-6 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-zinc-600 hover:bg-surface-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500"
          >
            Commands
          </Link>
        </div>
        <a
          href="#features"
          className="mt-10 inline-flex items-center gap-1 text-sm text-zinc-500 transition hover:text-zinc-300"
        >
          Features
          <span aria-hidden className="inline-block translate-y-px">
            ↓
          </span>
        </a>
      </div>
    </section>
  );
}
