import {useMemo} from 'react';
import {useT} from '~/lib/ui-strings';

interface Reason {
  emoji: string;
  emojiLabel: string;
  title: string;
  body: string;
}

interface Review {
  rating: number; // 0–5, halves supported
  quote: string;
  name: string;
  flag: string;
  country: string;
  date: string;
}

const REASONS: Reason[] = [
  {emoji: '🚐', emojiLabel: 'Minibus', title: 'Real Small Group',      body: "16 explorers, not 50. By Day 2, you'll know everyone's name."},
  {emoji: '🏕️', emojiLabel: 'Tent',    title: 'Authentic Berber Camp', body: 'Not a tourist resort. A real desert camp, run by the people of Erg Chebbi.'},
  {emoji: '🌟', emojiLabel: 'Star',    title: 'Local Moroccan Team',   body: "Born here. Drove these roads our whole lives. We don't read scripts."},
  {emoji: '💶', emojiLabel: 'Cash',    title: 'Honest Budget Pricing', body: 'No hidden fees. No surprise upgrades. Just the real Sahara at a fair price.'},
];

const REVIEW: Review = {
  rating: 4.5,
  quote:
    "\u201CI was nervous about booking the 'cheap' option. Turns out it's not cheap, it's just fair. Best decision of my whole trip.\u201D",
  name: 'Lukas',
  flag: '🇩🇪',
  country: 'Germany',
  date: 'March 2026',
};

export interface WhyChooseUsProps {
  /** Section heading. */
  heading?: string;
  /** Override the default reason cards. */
  reasons?: Reason[];
  /** Override the default featured review. */
  review?: Review;
}

export function WhyChooseUs({
  heading = 'Why do travelers keep choosing us?',
  reasons = REASONS,
  review = REVIEW,
}: WhyChooseUsProps) {
  const t = useT();
  return (
    <section aria-label={t('aria.why_us.section', 'Why travelers keep choosing us')} className="bg-sand py-section">
      <div className="container max-w-content">
        <h2 className="text-center font-display text-dark tracking-tight text-h2">
          {heading}
        </h2>

        {/* ── Reason cards (staggered on desktop) ── */}
        <ul
          role="list"
          className="mt-subtitle grid grid-cols-1 items-start gap-5
                     sm:grid-cols-2 sm:gap-5
                     lg:grid-cols-4 lg:gap-6
                     [&>li:nth-child(1)]:lg:translate-y-8 [&>li:nth-child(4)]:lg:translate-y-8"
        >
          {reasons.map((r) => (
            <li
              key={r.title}
              className="flex min-h-70 flex-col items-center justify-center rounded-card bg-white px-6 pb-10 pt-10 text-center shadow-card">
              <span role="img" aria-label={r.emojiLabel} className="mb-7 text-5xl">
                {r.emoji}
              </span>
              <h3 className="font-body font-bold text-h3 text-dark tracking-tight">{r.title}</h3>
              <p className="mt-3.5 max-w-68 font-body text-base text-dark text-pretty">
                {r.body}
              </p>
            </li>
          ))}
        </ul>

        {/* ── Featured review ── */}
        <figure className="relative mx-auto mt-section max-w-150 px-6 text-center">
          <span aria-hidden="true" className="pointer-events-none absolute -bottom-21 left-0 md:left-30 select-none text-9xl text-dark/5">
            &ldquo;
          </span>
          <span aria-hidden="true" className="pointer-events-none absolute -bottom-21 right-0 md:right-30 select-none text-9xl text-dark/5">
            &rdquo;
          </span>

          <StarRating rating={review.rating} />

          <blockquote className="relative z-10 mt-5.5 font-body font-bold text-dark text-base">
            {review.quote}
          </blockquote>

          <figcaption className="relative z-10 mt-5.5 flex items-center justify-center gap-2.5 font-body font-medium text-base text-dark">
            <span>{review.name}</span>
            <span aria-hidden="true" className="text-dark/35">·</span>
            <span role="img" aria-label={review.country} className="text-xl">{review.flag}</span>
            <span aria-hidden="true" className="text-dark/35">·</span>
            <span>{review.date}</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function StarRating({rating}: {rating: number}) {
  const t = useT();
  const stars = useMemo(() => {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    return Array.from({length: 5}, (_, i) => (i < full ? 'full' : i === full && half ? 'half' : 'empty'));
  }, [rating]);

  return (
    <div
      role="img"
      aria-label={t('aria.rating', 'Rated {rating} out of 5', {rating})}
      className="flex justify-center gap-1 text-amber-300"
    >
      {stars.map((kind, i) => (
        <Star key={i} kind={kind} id={`why-star-${i}`} />
      ))}
    </div>
  );
}

function Star({kind, id}: {kind: string; id: string}) {
  const d =
    'M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.9l-5.8 3.07 1.1-6.47-4.7-4.58 6.5-.95L12 2.5z';
  if (kind === 'half') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <defs>
          <linearGradient id={id}>
            <stop offset="50%" stopColor="currentColor" />
            <stop offset="50%" stopColor="currentColor" stopOpacity="0.28" />
          </linearGradient>
        </defs>
        <path d={d} fill={`url(#${id})`} />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} fill="currentColor" fillOpacity={kind === 'empty' ? 0.28 : 1} />
    </svg>
  );
}

export default WhyChooseUs;
