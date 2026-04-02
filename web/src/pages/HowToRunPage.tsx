import { SetupHeroSection } from '../components/howto/SetupHeroSection';
import { DiscordStepsSection } from '../components/howto/DiscordStepsSection';
import { YouTubeApiSection } from '../components/howto/YouTubeApiSection';
import { EnvSection } from '../components/howto/EnvSection';
import { NpmScriptsSection } from '../components/howto/NpmScriptsSection';

export function HowToRunPage() {
  return (
    <main className="page-main">
      <SetupHeroSection />
      <DiscordStepsSection />
      <YouTubeApiSection />
      <EnvSection />
      <NpmScriptsSection />
    </main>
  );
}
