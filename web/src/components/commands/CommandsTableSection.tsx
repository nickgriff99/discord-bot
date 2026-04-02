import { commandRows } from '../../content/commandsTable';
import { FadeSection } from '../ui/FadeSection';

export function CommandsTableSection() {
  return (
    <FadeSection>
      <section id="commands">
        <h2 className="font-display text-2xl font-semibold text-white">Slash commands</h2>
        <p className="mt-1 text-sm text-zinc-500">Reference</p>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-surface-border">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-surface-raised/80">
                <th className="px-4 py-3 font-semibold text-zinc-300">Command</th>
                <th className="px-4 py-3 font-semibold text-zinc-300">Parameters</th>
                <th className="px-4 py-3 font-semibold text-zinc-300">Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {commandRows.map((row) => (
                <tr key={row.command} className="bg-surface-card/40 hover:bg-surface-card/60">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-accent-bright">{row.command}</td>
                  <td className="px-4 py-3 text-zinc-400">{row.parameters}</td>
                  <td className="px-4 py-3 text-zinc-300">{row.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </FadeSection>
  );
}
