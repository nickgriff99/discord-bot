export function SetupHeroSection() {
  return (
    <header className="mb-12 max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Setup</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">
        Run the bot and add it to your server
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-zinc-400">
        Discord application, permissions, <code className="rounded bg-surface-card px-1.5 py-0.5 text-sm">.env</code>, then{' '}
        <code className="rounded bg-surface-card px-1.5 py-0.5 text-sm">npm start</code>. The terminal prints the URL for{' '}
        <code className="rounded bg-surface-card px-1.5 py-0.5 text-sm">web/</code> (default{' '}
        <code className="rounded bg-surface-card px-1.5 py-0.5 text-sm">http://localhost:4173</code>; optional{' '}
        <code className="rounded bg-surface-card px-1.5 py-0.5 text-sm">WEB_PORT</code>).
      </p>
    </header>
  );
}
