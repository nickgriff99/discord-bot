import { Link } from 'react-router-dom';
import { features } from '../../content/features';
import { FeatureCard } from './FeatureCard';
import { FadeSection } from '../ui/FadeSection';

export function FeaturesSection() {
  return (
    <FadeSection>
      <section id="features" className="space-y-10">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Features</p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-white sm:text-4xl">
            Playback and queue
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <FeatureCard key={f.title} feature={f} />
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-3 pt-4">
          <Link
            to="/how-to-run"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-bright"
          >
            Install &amp; invite
          </Link>
          <Link
            to="/commands"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-surface-border px-6 py-2.5 text-sm font-semibold text-zinc-200 transition hover:bg-white/5"
          >
            Command list
          </Link>
        </div>
      </section>
    </FadeSection>
  );
}
