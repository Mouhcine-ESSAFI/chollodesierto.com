import {useMemo} from 'react';
import {useT} from '~/lib/ui-strings';

export interface ReviewCard {
  quote: string;
  name: string;
  date: string;
  /** 0–5, halves supported. */
  rating: number;
  /** Emoji flag. Optional — the separator is dropped when it is missing. */
  flag?: string;
  /** Accessible country name, read in place of the flag emoji. */
  country?: string;
}

export interface ReviewsProps {
  heading?: string;
  subheading?: string;
  reviews?: ReviewCard[];
  /**
   * Drops the white-to-sand gradient for flat sand. Set where the section sits
   * directly under PageHero, whose own gradient already lands on sand.
   */
  flush?: boolean;
}

/**
 * Only rendered if the Shopify `review` query fails. Real reviews live in
 * Admin > Content > Metaobjects > Review, with `placement` containing "reviews".
 */
const FALLBACK: ReviewCard[] = [
  {
    quote:
      'Our guide Youssef grew up in the desert. His stories made the whole trip. You can’t fake that.',
    name: 'Marcus K',
    date: 'February 2025',
    rating: 4.5,
    flag: '🇩🇪',
    country: 'Germany',
  },
];

/**
 * The reviews archive. Cards use the same treatment as the homepage
 * Testimonials section — centered, star rating over a bold quote, oversized
 * decorative quote marks, then name · flag · date and the verified pill.
 *
 * Laid out as a plain grid rather than the homepage carousel: this page exists
 * to show every review at once, so paging through three at a time would hide
 * most of them.
 */
export function Reviews({
  heading,
  subheading,
  reviews = FALLBACK,
  flush = false,
}: ReviewsProps) {
  const t = useT();

  return (
    <section
      aria-labelledby="reviews-heading"
      className={`py-section ${
        flush ? 'bg-sand' : 'bg-linear-to-b from-white from-40% to-sand'
      }`}
    >
      <div className="container max-w-content">

        {/* Header */}
        <div className="mx-auto mb-[clamp(44px,5vw,76px)] max-w-180 text-center">
          <h2
            id="reviews-heading"
            className="text-h3 md:text-h2 font-display text-dark"
          >
            {heading || t('reviews.heading', 'What travelers are saying')}
          </h2>
          {subheading && <p className="mt-4 text-base text-dark/70">{subheading}</p>}
        </div>

        {/* Every review, three across on desktop. The row gap is larger than the
            column gap so the oversized quote marks below each caption have room
            and never reach the card beneath. */}
        <ul
          role="list"
          className="mx-auto grid max-w-130 grid-cols-1 gap-x-10 gap-y-20
                     lg:max-w-none lg:grid-cols-3 lg:gap-x-[clamp(24px,3vw,48px)] lg:gap-y-24"
        >
          {reviews.map((review, i) => (
            <li key={`${review.name}-${review.date}-${i}`}>
              <figure className="relative px-[clamp(20px,2.4vw,40px)] text-center">
                <StarRating rating={review.rating} idPrefix={`review-${i}`} />

                <blockquote className="relative z-10 mt-4.5 font-body font-bold text-[clamp(1.0625rem,1.35vw,1.15rem)] text-dark/90">
                  {review.quote}
                </blockquote>

                <div className="relative mt-5.5">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-21 left-0 md:-left-10 select-none text-9xl leading-none text-dark/9"
                  >
                    &ldquo;
                  </span>
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-21 right-0 md:-right-10 select-none text-9xl leading-none text-dark/9"
                  >
                    &rdquo;
                  </span>
                  <figcaption className="relative z-10 flex flex-wrap items-center justify-center gap-2.5 font-body font-medium text-base text-dark/75">
                    <span>{review.name}</span>
                    {review.flag && (
                      <>
                        <span aria-hidden="true" className="text-dark/30">·</span>
                        <span
                          role="img"
                          aria-label={review.country || undefined}
                          className="text-lg leading-none"
                        >
                          {review.flag}
                        </span>
                      </>
                    )}
                    {review.date && (
                      <>
                        <span aria-hidden="true" className="text-dark/30">·</span>
                        <span>{review.date}</span>
                      </>
                    )}
                  </figcaption>
                </div>

                <div className="mt-4 flex justify-center">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-forest/10 px-3 py-1.25 text-[0.5rem] font-semibold uppercase text-forest">
                    <CheckIcon />
                    {t('reviews.verified', 'Verified traveler')}
                  </span>
                </div>
              </figure>
            </li>
          ))}
        </ul>

      </div>
    </section>
  );
}

// ── Sub-components (mirrors the homepage Testimonials treatment) ─────────────

function StarRating({rating, idPrefix}: {rating: number; idPrefix: string}) {
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
      className="mb-4.5 flex justify-center gap-[3px] text-[#F4B41E]"
    >
      {stars.map((kind, i) => (
        <Star key={i} kind={kind} id={`${idPrefix}-star-${i}`} />
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
            <stop offset="50%" stopColor="currentColor" stopOpacity="0.16" />
          </linearGradient>
        </defs>
        <path d={d} fill={`url(#${id})`} />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} fill="currentColor" fillOpacity={kind === 'empty' ? 0.16 : 1} />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default Reviews;
