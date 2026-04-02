import { FadeSection } from '../ui/FadeSection';

const envExample = `DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id
YOUTUBE_API_KEY=your_youtube_api_key
# Optional: register slash commands to one guild for instant updates while testing
# DISCORD_GUILD_ID=your_test_server_id`;

export function EnvSection() {
  return (
    <FadeSection className="mb-20">
      <section>
        <h2 className="font-display text-2xl font-semibold text-white">
          Create <code className="text-xl">.env</code> in the project root
        </h2>
        <p className="mt-1 text-sm text-zinc-500">Environment</p>
        <pre className="mt-6 overflow-x-auto rounded-2xl border border-surface-border bg-zinc-950 p-4 text-left text-sm leading-relaxed text-zinc-300">
          <code>{envExample}</code>
        </pre>
        <p className="mt-4 text-sm text-zinc-500">
          If commands do not appear immediately, set{' '}
          <code className="rounded bg-surface-card px-1.5 py-0.5 text-xs">DISCORD_GUILD_ID</code> for your test server or
          wait for global registration to propagate.
        </p>
      </section>
    </FadeSection>
  );
}
