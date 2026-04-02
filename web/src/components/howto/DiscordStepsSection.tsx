import { FadeSection } from '../ui/FadeSection';

export function DiscordStepsSection() {
  return (
    <FadeSection className="mb-20">
      <section>
        <h2 className="font-display text-2xl font-semibold text-white">Create the bot and invite it</h2>
        <p className="mt-1 text-sm text-zinc-500">Discord application</p>
        <ol className="mt-6 list-decimal space-y-3 pl-5 text-zinc-300 marker:text-accent">
          <li>
            Open the{' '}
            <a
              href="https://discord.com/developers/applications"
              className="text-accent-bright underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
              rel="noopener noreferrer"
            >
              Discord Developer Portal
            </a>
            .
          </li>
          <li>Create a new application.</li>
          <li>
            In <strong className="text-white">Bot</strong>, add a bot user and copy the token for{' '}
            <code className="rounded bg-surface-card px-1.5 py-0.5 text-sm">DISCORD_BOT_TOKEN</code>.
          </li>
          <li>
            In <strong className="text-white">General Information</strong>, copy the{' '}
            <strong className="text-white">Application ID</strong> for{' '}
            <code className="rounded bg-surface-card px-1.5 py-0.5 text-sm">DISCORD_CLIENT_ID</code>.
          </li>
          <li>
            In <strong className="text-white">OAuth2 → URL Generator</strong>:
            <ul className="mt-2 list-disc space-y-1 pl-5 text-zinc-400">
              <li>
                Scopes: <code className="rounded bg-surface-card px-1 py-0.5 text-xs">bot</code>,{' '}
                <code className="rounded bg-surface-card px-1 py-0.5 text-xs">applications.commands</code>
              </li>
              <li>Bot permissions: Send Messages, Use Slash Commands, Connect, Speak, Use Voice Activity</li>
            </ul>
          </li>
          <li>Open the generated invite URL and add the bot to your server.</li>
        </ol>
      </section>
    </FadeSection>
  );
}
