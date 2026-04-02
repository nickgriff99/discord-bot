import { FadeSection } from '../ui/FadeSection';

const scripts = [
  { step: '1. Install', code: 'npm install' },
  { step: '2. Start bot + web', code: 'npm start' },
  { step: '3. Dev (watch)', code: 'npm run dev' },
  { step: '4. Web only', code: 'npm run dev:web' }
];

export function NpmScriptsSection() {
  return (
    <FadeSection>
      <section>
        <h2 className="font-display text-2xl font-semibold text-white">Install dependencies and run</h2>
        <p className="mt-1 text-sm text-zinc-500">Start</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {scripts.map(({ step, code }) => (
            <div
              key={step}
              className="rounded-2xl border border-surface-border bg-surface-card/60 p-5"
            >
              <h3 className="text-sm font-medium text-zinc-400">{step}</h3>
              <pre className="mt-3 overflow-x-auto rounded-lg bg-zinc-950 p-3 text-sm text-zinc-200">
                <code>{code}</code>
              </pre>
            </div>
          ))}
        </div>
        <p className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-zinc-400">
          After <code className="rounded bg-surface-card px-1.5 py-0.5 text-xs">npm start</code>, the terminal shows the{' '}
          <code className="rounded bg-surface-card px-1.5 py-0.5 text-xs">web/dist</code> URL once the site is built. Run{' '}
          <code className="rounded bg-surface-card px-1.5 py-0.5 text-xs">npm run build:web</code> first if needed. Optional:{' '}
          <code className="rounded bg-surface-card px-1.5 py-0.5 text-xs">WEB_PORT</code>. See{' '}
          <code className="rounded bg-surface-card px-1.5 py-0.5 text-xs">HOSTING.md</code>.
        </p>
      </section>
    </FadeSection>
  );
}
