import type { Feature } from '../../content/features';

type FeatureCardProps = {
  feature: Feature;
};

export function FeatureCard({ feature }: FeatureCardProps) {
  const { tag, title, body, wide, accent } = feature;

  return (
    <article
      className={[
        'group rounded-2xl border border-surface-border bg-surface-card/60 p-6 backdrop-blur-sm transition',
        'hover:border-accent/25 hover:bg-surface-card hover:shadow-glow',
        wide ? 'sm:col-span-2' : '',
        accent ? 'border-accent/20 bg-accent-dim/50' : ''
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {tag ? (
        <span className="mb-3 inline-block rounded-md bg-white/5 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-accent-bright">
          {tag}
        </span>
      ) : null}
      <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">{body}</p>
    </article>
  );
}
