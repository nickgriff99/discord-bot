import { FadeSection } from '../ui/FadeSection';

export function UsageFlowSection() {
  return (
    <FadeSection className="mb-20">
      <section>
        <h2 className="font-display text-2xl font-semibold text-white">Basic usage</h2>
        <p className="mt-1 text-sm text-zinc-500">Flow</p>
        <ol className="mt-6 list-decimal space-y-3 pl-5 text-zinc-300 marker:text-accent">
          <li>Join a voice channel.</li>
          <li>
            Type <code className="rounded bg-surface-card px-1.5 py-0.5 text-sm">/play</code> and enter a song name,
            search words, or a YouTube-friendly link.
          </li>
          <li>
            Use <code className="rounded bg-surface-card px-1.5 py-0.5 text-sm">/queue</code> and{' '}
            <code className="rounded bg-surface-card px-1.5 py-0.5 text-sm">/nowplaying</code> to see what is on.
          </li>
          <li>
            Adjust with <code className="rounded bg-surface-card px-1.5 py-0.5 text-sm">/pause</code>,{' '}
            <code className="rounded bg-surface-card px-1.5 py-0.5 text-sm">/resume</code>,{' '}
            <code className="rounded bg-surface-card px-1.5 py-0.5 text-sm">/skip</code>,{' '}
            <code className="rounded bg-surface-card px-1.5 py-0.5 text-sm">/previous</code>,{' '}
            <code className="rounded bg-surface-card px-1.5 py-0.5 text-sm">/volume</code>, or stop entirely with{' '}
            <code className="rounded bg-surface-card px-1.5 py-0.5 text-sm">/stop</code>.
          </li>
          <li>
            Use <code className="rounded bg-surface-card px-1.5 py-0.5 text-sm">/leave</code> when you want the bot to
            disconnect from voice.
          </li>
        </ol>
        <p className="mt-6 text-sm text-zinc-500">
          <code className="rounded bg-surface-card px-1.5 py-0.5 text-xs">/join</code> helps confirm voice readiness;
          playback usually starts when you use <code className="rounded bg-surface-card px-1.5 py-0.5 text-xs">/play</code>
          . <code className="rounded bg-surface-card px-1.5 py-0.5 text-xs">/debug</code> shows runtime status for
          troubleshooting.
        </p>
      </section>
    </FadeSection>
  );
}
