import { FadeSection } from '../ui/FadeSection';

export function YouTubeApiSection() {
  return (
    <FadeSection className="mb-20">
      <section>
        <h2 className="font-display text-2xl font-semibold text-white">API key for search and playback</h2>
        <p className="mt-1 text-sm text-zinc-500">YouTube Data API</p>
        <ol className="mt-6 list-decimal space-y-3 pl-5 text-zinc-300 marker:text-accent">
          <li>
            Open{' '}
            <a
              href="https://console.cloud.google.com"
              className="text-accent-bright underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
              rel="noopener noreferrer"
            >
              Google Cloud Console
            </a>
            .
          </li>
          <li>Create or select a project.</li>
          <li>
            Enable <strong className="text-white">YouTube Data API v3</strong>.
          </li>
          <li>
            Create an API key and set{' '}
            <code className="rounded bg-surface-card px-1.5 py-0.5 text-sm">YOUTUBE_API_KEY</code> in your{' '}
            <code className="rounded bg-surface-card px-1.5 py-0.5 text-sm">.env</code>.
          </li>
        </ol>
      </section>
    </FadeSection>
  );
}
