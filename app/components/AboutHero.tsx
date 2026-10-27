import {useT} from '~/lib/ui-strings';

interface Stat {
  rating: string;
  label: string;
}

export interface AboutHeroProps {
  /** Full-bleed background image of the dunes. Falls back to a default. */
  heroImage?: string;
  /** Alt text for the background image. */
  heroImageAlt?: string;
  /** Two-line headline (use \n / <br/> handled internally). */
  titleLines?: [string, string];
  /** Supporting paragraph beneath the headline. */
  body?: string;
  /** Primary CTA label. */
  ctaLabel?: string;
  /** Primary CTA target. */
  ctaHref?: string;
  /** Social-proof rating shown under the CTA. */
  stat?: Stat;
}

export function AboutHero({
  heroImage = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1800&q=80',
  heroImageAlt = 'Lone traveler walking a golden Sahara dune ridge',
  titleLines = ['We\u2019re a few people from', 'the Sahara, sharing it with you.'],
  body = 'Born in the south. Raised on the dunes. Tired of watching tourists pay \u20ac300 for a piece of the place we call home.',
  ctaLabel,
  ctaHref = '/booking',
  stat = {rating: '4.9', label: 'Trusted by 3k+ people.'},
}: AboutHeroProps) {
  const t = useT();
  return (
    <section
      aria-label={t('aria.about.hero', 'About us')}
      className="relative flex min-h-[clamp(600px,90vh,900px)] items-center justify-center overflow-hidden bg-sand"
    >
      <img
        src={heroImage}
        alt={heroImageAlt}
        className="absolute inset-0 h-full w-full object-cover"
        loading="eager"
      />
      {/* Soft warm scrim behind the copy so white text stays legible on bright sand */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-linear-to-b from-dark/60 from-0% via-dark/30 via-50% to-sand"
      />

      <div className="relative z-10 mx-auto max-w-160 px-6 text-center">
        <h1 className="font-display text-h1 text-white">
          {titleLines[0]}
          <br />
          {titleLines[1]}
        </h1>

        <p className="mx-auto mt-6 max-w-110 text-h3 text-white">
          {body}
        </p>

        <div className="mt-12 flex justify-center">
          <a
            href={ctaHref}
            className="inline-flex items-center gap-2.5 rounded-full bg-primary px-9 py-4 font-display text-h3 text-white shadow-card-m transition-colors hover:bg-primary/90"
          >
            {ctaLabel ?? t('about.hero_cta', 'Book Your Adventure')}
            <span aria-hidden="true">&rarr;</span>
          </a>
        </div>

        <p className="mt-7 flex items-center justify-center gap-1.5 text-base font-medium text-white/90 [text-shadow:0_1px_10px_rgba(60,25,8,0.3)]">
          <span className="font-bold">{stat.rating}</span>
          <StarIcon className="text-primary" />
          {stat.label}
        </p>
      </div>
    </section>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function StarIcon({className = ''}: {className?: string}) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1"
      aria-hidden="true"
      className={className}
    >
      <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
    </svg>
  );
}

export default AboutHero;