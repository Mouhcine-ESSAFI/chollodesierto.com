import {useMemo} from 'react';
import {useT} from '~/lib/ui-strings';

interface ChecklistItem {
  /** Emoji glyph. */
  icon: string;
  /** Accessible label for the emoji. */
  iconLabel: string;
  text: string;
}

interface Review {
  rating: number; // 0–5, halves supported
  quote: string;
  name: string;
  flag: string;
  country: string;
  date: string;
}

const INCLUDED: ChecklistItem[] = [
  {
    icon: '🚐',
    iconLabel: 'Minibus',
    text: 'AC minibus + English-speaking driver',
  },
  {
    icon: '🐫',
    iconLabel: 'Camel',
    text: 'Camel trek into Erg Chebbi at sunset',
  },
  {
    icon: '🏕️',
    iconLabel: 'Camp',
    text: 'Camp accommodation (your chosen tier)',
  },
  {
    icon: '🍲',
    iconLabel: 'Meals',
    text: 'All meals (2 breakfasts, 2 dinners, water at meals)',
  },
  {
    icon: '🎶',
    iconLabel: 'Music',
    text: 'Live Berber music night around the fire',
  },
  {icon: '🌅', iconLabel: 'Sunrise', text: 'Sunrise dune climb on Day 3'},
  {
    icon: '🏛️',
    iconLabel: 'Stops',
    text: 'Stops at Ait Ben Haddou, Ouarzazate, Todra Gorge, Dades Valley',
  },
  {icon: '📷', iconLabel: 'Photos', text: 'All the photos you can take'},
  {
    icon: '✨',
    iconLabel: 'Stories',
    text: 'Stories that will outlast the trip',
  },
];

const BRING: ChecklistItem[] = [
  {
    icon: '🧥',
    iconLabel: 'Warm layers',
    text: 'Warm layers (desert nights are cold, year-round)',
  },
  {icon: '🕶️', iconLabel: 'Sun protection', text: 'Sunglasses, sunscreen, hat'},
  {
    icon: '🔋',
    iconLabel: 'Power bank',
    text: 'Power bank (limited electricity at camp)',
  },
  {icon: '💧', iconLabel: 'Water bottle', text: 'Reusable water bottle'},
  {icon: '💶', iconLabel: 'Cash', text: 'Cash for drinks, tips, extras'},
  {icon: '📸', iconLabel: 'Camera', text: 'Camera (your phone works fine)'},
  {icon: '❤️', iconLabel: 'Open mind', text: 'An open mind'},
];

const REVIEW: Review = {
  rating: 4.5,
  quote:
    '\u201CThe \u2018bring warm layers\u2019 warning saved me. December desert is no joke.\u201D',
  name: 'Aiko',
  flag: '🇯🇵',
  country: 'Japan',
  date: 'December 2024',
};

export interface IncludedProps {
  heading?: string;
  subheading?: string;
  includedTitle?: string;
  bringTitle?: string;
  included?: ChecklistItem[];
  bring?: ChecklistItem[];
  review?: Review;
  /** Show the star rating + testimonial. */
  showReview?: boolean;
}

export function Included({
  heading = 'What’s in the price. What’s in your backpack.',
  subheading = 'We believe in transparent pricing. No hidden fees, no surprise charges.',
  includedTitle = 'All of this is included',
  bringTitle = 'Bring these yourself',
  included = INCLUDED,
  bring = BRING,
  review = REVIEW,
  showReview = true,
}: IncludedProps) {
  const t = useT();
  return (
    <section
      aria-label={t('aria.included.section', "What's in the price and what to bring")}
      className="bg-gradient-to-b from-white from-30% to-sand py-section"
    >
      <div className="container max-w-content">
        {/* Header */}
        <div className="mx-auto mb-[clamp(44px,5vw,72px)] max-w-225 text-center">
          <h2 className="text-h2 font-display text-dark">{heading}</h2>
          <p className="mt-4.5 text-base text-dark">{subheading}</p>
        </div>

        {/* Two columns */}
        <div className="grid grid-cols-1 items-start gap-10 md:grid-cols-[1.05fr_0.95fr] md:gap-[clamp(48px,6vw,104px)]">
          {/* Included card */}
          <div className="rounded-card bg-white p-[clamp(30px,3.4vw,46px)] shadow-card">
            <div className="mb-7.5 flex items-center gap-3.5">
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest"
              >
                <CheckIcon className="text-white" />
              </span>
              <h3 className="text-h3 font-body font-bold tracking-tight text-forest">
                {includedTitle}
              </h3>
            </div>
            <Checklist items={included} />
          </div>

          {/* Bring-yourself column */}
          <div className="p-[clamp(30px,3.4vw,46px)]">
            <div className="mb-7.5 flex items-center gap-3.5">
              <span
                role="img"
                aria-label={t('aria.included.emoji', 'Backpack')}
                className="text-3xl leading-none"
              >
                🎒
              </span>
              <h3 className="text-h3 font-body font-bold tracking-tight text-primary">
                {bringTitle}
              </h3>
            </div>
            <Checklist items={bring} />
          </div>
        </div>

        {/* Testimonial */}
        {showReview && (
          <figure className="relative mx-auto mt-[clamp(60px,7vw,104px)] max-w-155 px-11 text-center">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-21 left-30 select-none text-9xl leading-none text-dark/5"
            >
              &ldquo;
            </span>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-21 right-30 select-none text-9xl leading-none text-dark/5"
            >
              &rdquo;
            </span>

            <StarRating rating={review.rating} />

            <blockquote className="relative z-10 mt-5 font-body font-bold text-dark text-[clamp(1.0625rem,1.8vw,1.3rem)] leading-relaxed text-balance">
              {review.quote}
            </blockquote>

            <figcaption className="relative z-10 mt-5 flex items-center justify-center gap-2.5 font-body font-medium text-base text-dark/75">
              <span>{review.name}</span>
              <span aria-hidden="true" className="text-dark/35">
                ·
              </span>
              <span role="img" aria-label={review.country} className="text-xl">
                {review.flag}
              </span>
              <span aria-hidden="true" className="text-dark/35">
                ·
              </span>
              <span>{review.date}</span>
            </figcaption>
          </figure>
        )}
      </div>
    </section>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function Checklist({items}: {items: ChecklistItem[]}) {
  return (
    <ul role="list" className="flex flex-col gap-3">
      {items.map((item) => (
        <li
          key={item.text}
          className="flex items-start gap-4 text-base leading-snug text-dark/90"
        >
          <span
            role="img"
            aria-label={item.iconLabel}
            className="w-6.5 shrink-0 text-center text-[22px] leading-tight"
          >
            {item.icon}
          </span>
          <span>{item.text}</span>
        </li>
      ))}
    </ul>
  );
}

function CheckIcon({className = ''}: {className?: string}) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function StarRating({rating}: {rating: number}) {
  const t = useT();
  const stars = useMemo(() => {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    return Array.from({length: 5}, (_, i) =>
      i < full ? 'full' : i === full && half ? 'half' : 'empty',
    );
  }, [rating]);

  return (
    <div
      role="img"
      aria-label={t('aria.rating', 'Rated {rating} out of 5', {rating})}
      className="mb-5 flex justify-center gap-1 text-[#F4B41E]"
    >
      {stars.map((kind, i) => (
        <Star key={i} kind={kind} id={`pb-star-${i}`} />
      ))}
    </div>
  );
}

function Star({kind, id}: {kind: string; id: string}) {
  const d =
    'M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.9l-5.8 3.07 1.1-6.47-4.7-4.58 6.5-.95L12 2.5z';
  if (kind === 'half') {
    return (
      <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
        <defs>
          <linearGradient id={id}>
            <stop offset="50%" stopColor="currentColor" />
            <stop offset="50%" stopColor="currentColor" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <path d={d} fill={`url(#${id})`} />
      </svg>
    );
  }
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={d}
        fill="currentColor"
        fillOpacity={kind === 'empty' ? 0.3 : 1}
      />
    </svg>
  );
}

export default Included;
