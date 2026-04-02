import { UsageHeroSection } from '../components/commands/UsageHeroSection';
import { UsageFlowSection } from '../components/commands/UsageFlowSection';
import { CommandsTableSection } from '../components/commands/CommandsTableSection';

export function CommandsPage() {
  return (
    <main>
      <UsageHeroSection />
      <UsageFlowSection />
      <CommandsTableSection />
    </main>
  );
}
