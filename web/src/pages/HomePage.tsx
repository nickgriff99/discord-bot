import { HeroSection } from '../components/home/HeroSection';
import { StatStrip } from '../components/home/StatStrip';
import { FeaturesSection } from '../components/home/FeaturesSection';
import { FadeSection } from '../components/ui/FadeSection';

export function HomePage() {
  return (
    <main>
      <HeroSection />
      <FadeSection className="mb-20 sm:mb-28">
        <StatStrip />
      </FadeSection>
      <FeaturesSection />
    </main>
  );
}
