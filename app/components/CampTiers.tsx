import {SafeImage} from './SafeImage';
import {useT} from '~/lib/ui-strings';

interface Camp {
  name: string;
  image: string;
  imageAlt: string;
  /** Short overlay line shown on the photo, e.g. "Traditional. Social. Real." */
  badge: string;
  /** Tiny uppercase label above the price, e.g. "In price" / "Per person". */
  priceLabel: string;
  /** The price value, e.g. "Included" / "+€15". */
  priceValue: string;
  features: string[];
  bestForEmoji: string;
  bestForEmojiLabel: string;
  bestForText: string;
  /** The middle, raised + emphasised tier. */
  featured?: boolean;
}

interface Review {
  rating: number; // 0–5, halves supported
  quote: string;
  name: string;
  flag: string;
  country: string;
  date: string;
}

const CAMPS: Camp[] = [
  {
    name: 'Shared Camp',
    image:
      'https://images.unsplash.com/photo-1542401886-65d6c61db217?auto=format&fit=crop&w=900&q=80',
    imageAlt: 'Travelers and camels at a Sahara desert camp',
    badge: 'Traditional. Social. Real.',
    priceLabel: 'In price',
    priceValue: 'Included',
    features: [
      'Berber tent (shared with up to 4 travelers)',
      'Real beds, warm blankets',
      'Shared bathrooms',
      'Communal dinner around the fire',
    ],
    bestForEmoji: '🎒',
    bestForEmojiLabel: 'Backpack',
    bestForText: 'Solo travelers, backpackers, anyone who came for the vibes.',
  },
  {
    name: 'Comfort Camp',
    image:
      'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?auto=format&fit=crop&w=1000&q=80',
    imageAlt: 'Lantern-lit Marrakech night market',
    badge: 'Private. Quiet. Easy.',
    priceLabel: 'Per person',
    priceValue: '+€15',
    features: [
      'Private tent for your group',
      'Larger beds, better insulation',
      'Private bathroom inside the tent',
      'Same fire. Same dinner. Same stars.',
    ],
    bestForEmoji: '👨‍👩‍👧',
    bestForEmojiLabel: 'Family',
    bestForText: 'Couples, families, light upgraders.',
    featured: true,
  },
  {
    name: 'Superior Camp',
    image:
      'https://images.unsplash.com/photo-1597212618440-806262de4f6b?auto=format&fit=crop&w=900&q=80',
    imageAlt: 'Ornate Moroccan interior detail',
    badge: 'Luxury, in the middle of nowhere.',
    priceLabel: 'Per person',
    priceValue: '+€45',
    features: [
      'Luxury private suite tent',
      'Premium bedding, real heating',
      'Private bathroom with hot shower',
      'Welcome drink, premium dinner',
    ],
    bestForEmoji: '🛀',
    bestForEmojiLabel: 'Bath',
    bestForText: 'Honeymoons, milestone trips, treat-yourself trips.',
  },
];

const REVIEW: Review = {
  rating: 4.5,
  quote:
    '\u201CUpgraded to Superior for our anniversary. Worth every euro. The hot shower in the desert felt illegal.\u201D',
  name: 'Maria & Tom',
  flag: '🇪🇸',
  country: 'Spain',
  date: 'February 2025',
};

export interface CampTiersProps {
  eyebrow?: string;
  heading?: string;
  /** Sub-heading lines, rendered stacked. */
  subheading?: string[];
  camps?: Camp[];
  review?: Review;
  /** Closing line under the CTA. */
  tagline?: string;
  ctaLabel?: string;
  /** Where the CTA goes. Defaults to the booking page. */
  ctaHref?: string;
  /** Raise the featured tier on desktop. */
  liftFeatured?: boolean;
  /** Show the "Best for" rows. */
  showBestFor?: boolean;
  /** Show the star rating + testimonial. */
  showReview?: boolean;
}

export function CampTiers({
  eyebrow = 'A bed under the stars',
  heading = 'Where You’ll Sleep',
  subheading = [
    'Every traveler sees the same stars.',
    'How comfortable you are getting there is up to you.',
  ],
  camps = CAMPS,
  review = REVIEW,
  tagline = 'Same stars. Same fire. Different pillow.',
  ctaLabel,
  ctaHref = '/booking',
  liftFeatured = true,
  showBestFor = true,
  showReview = true,
}: CampTiersProps) {
  const t = useT();
  return (
    <section
      aria-label={t('aria.camps.section', "Where you'll sleep")}
      className="bg-gradient-to-b from-white via-white to-sand py-section"
    >
      <div className="container max-w-content">

        {/* ── Header ── */}
        <div className="mx-auto mb-[clamp(48px,5vw,84px)] text-center">
          <p className="text-label font-bold uppercase text-primary">
            {eyebrow}
          </p>
          <div className="mt-2 flex justify-center">
            <LightningDivider />
          </div>
          <h2 className="mt-5 text-h3 md:text-h2 font-display text-dark">
            {heading}
          </h2>
          <p className="pb-16 text-dark text-base">
            {subheading.map((line, i) => (
              <span key={i} className="block">
                {line}
              </span>
            ))}
          </p>
        </div>

        {/* ── Camp tiers ── */}
        <ul
          role="list"
          className="mx-auto grid grid-cols-1 gap-15 max-w-110 lg:max-w-none lg:grid-cols-3 lg:items-start lg:gap-6"
        >
          {camps.map((camp) => (
            <li
              key={camp.name}
              className={[
                'relative flex flex-col rounded-route-sm bg-white pb-7.5',
                camp.featured
                  ? 'shadow-card'
                  : 'shadow-card',
                camp.featured && liftFeatured ? 'lg:-translate-y-13' : '',
              ].join(' ')}
            >
              {/* Photo + overlay badge */}
              <div
                className={`relative overflow-hidden rounded-route-sm rounded-b-none ${
                  camp.featured ? 'h-70' : 'h-70'
                }`}
              >
                <SafeImage
                  src={camp.image}
                  alt={camp.imageAlt}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-b from-transparent from-[80%] to-black"
                />
                <div
                  className={`absolute inset-x-0 gap-1 bottom-8 flex items-center text-xs font-display text-white 
                              ${camp.featured ? 'justify-center' : 'justify-center'}`}
                >
                  <span className="text-base" aria-hidden="true">✨</span>
                  {camp.badge}
                </div>
              </div>

              {/* Floating title + price bar */}
              <div
                className="relative z-10 -mt-6 flex items-center justify-around gap-3
                           rounded-full bg-white h-16
                           shadow-card-m"
              >
                <h3 className="font-body font-bold text-dark text-price">
                  {camp.name}
                </h3>
                <div className="flex flex-col text-center">
                  <span className="text-label-2xs font-bold uppercase text-forest -mb-1">
                    {camp.priceLabel}
                  </span>
                  <span className="text-price font-display text-forest">
                    {camp.priceValue}
                  </span>
                </div>
              </div>

              {/* Features + best-for */}
              <div className="pl-8 pt-8">
                <ul role="list" className="mb-5.5 flex flex-col gap-0.5">
                  {camp.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-base text-dark"
                    >
                      <CheckIcon className="mt-1 shrink-0 text-forest" />
                      {f}
                    </li>
                  ))}
                </ul>

                {showBestFor && (
                  <div className="flex items-center gap-4.5">
                    <span
                      role="img"
                      aria-label={camp.bestForEmojiLabel}
                      className="flex h-18 w-18 shrink-0 items-center justify-center rounded-full bg-sand text-4xl"
                    >
                      {camp.bestForEmoji}
                    </span>
                    <div>
                      <p className="text-btn font-display text-dark">{t('camps.best_for', 'Best for')}</p>
                      <p className="mt-1 text-base leading-[1.4] text-dark">
                        {camp.bestForText}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>

        {/* ── Testimonial ── */}
        {showReview && (
          <figure className="relative mx-auto mt-5.5 max-w-130 px-6 text-center">
            <span aria-hidden="true" className="pointer-events-none absolute -bottom-21 left-0 md:left-15 select-none text-9xl text-dark/5">
              &ldquo;
            </span>
            <span aria-hidden="true" className="pointer-events-none absolute -bottom-21 right-0 md:right-15 select-none text-9xl text-dark/5">
              &rdquo;
            </span>

            <StarRating rating={review.rating} />

            <blockquote className="relative z-10 mt-5.5 font-body font-bold text-dark text-base text-pretty">
              {review.quote}
            </blockquote>

            <figcaption className="relative z-10 mt-5.5 flex items-center justify-center gap-2.5 font-body font-medium text-base text-dark/75">
              <span>{review.name}</span>
              <span aria-hidden="true" className="text-dark/35">·</span>
              <span role="img" aria-label={review.country} className="text-xl">{review.flag}</span>
              <span aria-hidden="true" className="text-dark/35">·</span>
              <span>{review.date}</span>
            </figcaption>
          </figure>
        )}

        {/* ── CTA ── */}
        <div className="mt-14 text-center">
          <a
            href={ctaHref}
            className="inline-block rounded-full bg-primary px-14 py-4 font-display text-btn text-white
                       shadow-card transition-colors hover:bg-primary/90"
          >
            {ctaLabel ?? t('camps.cta', 'Book Now')}
          </a>
          <p className="mt-8 text-base text-dark">{tagline}</p>
        </div>

      </div>
    </section>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function LightningDivider() {
  return (
          <svg width="64" height="16" viewBox="0 0 64 16" fill="none">
            <svg width="50" height="18" viewBox="0 0 50 18" fill="none" aria-hidden="true">
              <path d="M3 10 L25 6 L20 10 L40 9" stroke="#C15A2B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </svg>
  );
}

function CheckIcon({className = ''}: {className?: string}) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
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
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const stars = Array.from({length: 5}, (_, i) =>
    i < full ? 'full' : i === full && half ? 'half' : 'empty',
  );

  return (
    <div
      role="img"
      aria-label={t('aria.rating', 'Rated {rating} out of 5', {rating})}
      className="mb-5.5 flex justify-center gap-1 text-amber-300"
    >
      {stars.map((kind, i) => (
        <Star key={i} kind={kind} id={`sleep-star-${i}`} />
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
            <stop offset="50%" stopColor="currentColor" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <path d={d} fill={`url(#${id})`} />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} fill="currentColor" fillOpacity={kind === 'empty' ? 0.3 : 1} />
    </svg>
  );
}

export default CampTiers;
