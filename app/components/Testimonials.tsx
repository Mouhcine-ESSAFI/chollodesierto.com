import {useT} from '~/lib/ui-strings';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

interface Testimonial {
  quote: string;
  name: string;
  /** Emoji flag. */
  flag: string;
  /** Accessible country name for the flag. */
  country: string;
  date: string;
  /** 0–5, halves supported. */
  rating: number;
}

const TESTIMONIALS: Testimonial[] = [
  {quote: '"Our guide Youssef grew up in the desert. His stories made the whole trip. You can’t fake that."', name: 'Marcus K', flag: '🇩🇪', country: 'Germany', date: 'February 2025', rating: 4.5},
  {quote: '"Skeptical at first, how can it be this cheap? Turns out they just don’t overcharge. Simple as that."', name: 'Emma', flag: '🇬🇧', country: 'United Kingdom', date: 'January 2025', rating: 4.5},
  {quote: '"The sunrise over Erg Chebbi changed something in me. I’m not exaggerating. Book this trip."', name: 'Johan R', flag: '🇳🇱', country: 'Netherlands', date: 'October 2024', rating: 4.5},
  {quote: '"Small group, real food, zero tourist traps. Exactly what the reviews promised."', name: 'Sofia', flag: '🇮🇹', country: 'Italy', date: 'March 2025', rating: 5},
  {quote: '"The camp at night with the fire and music — I still think about it every week."', name: 'Daniel', flag: '🇺🇸', country: 'United States', date: 'November 2024', rating: 4.5},
  {quote: '"Booked last-minute and had zero regrets. The minibus was comfortable and the driver hilarious."', name: 'Amelie', flag: '🇫🇷', country: 'France', date: 'February 2025', rating: 5},
];

export interface TestimonialsProps {
  heading?: string;
  subheading?: string;
  reviews?: Testimonial[];
  /** Cards shown per slide (desktop). */
  perPage?: number;
  /** Auto-advance interval in ms. Set 0 to disable. */
  autoplayMs?: number;
  primaryCtaLabel?: string;
  secondaryCtaLabel?: string;
  primaryCtaHref?: string;
  secondaryCtaHref?: string;
}

export function Testimonials({
  heading = '3,000+ stories. Same desert.',
  subheading = 'Read what travelers tell us after they go home.',
  reviews = TESTIMONIALS,
  perPage = 3,
  autoplayMs = 5500,
  primaryCtaLabel,
  secondaryCtaLabel,
  primaryCtaHref = '/booking',
  secondaryCtaHref = '/reviews',
}: TestimonialsProps) {
  const t = useT();
  const pages = useMemo(() => {
    const chunks: Testimonial[][] = [];
    for (let i = 0; i < reviews.length; i += perPage) {
      chunks.push(reviews.slice(i, i + perPage));
    }
    return chunks.length ? chunks : [[]];
  }, [reviews, perPage]);

  const pageCount = pages.length;
  const [page, setPage] = useState(0);
  const active = ((page % pageCount) + pageCount) % pageCount;

  const paused = useRef(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const go = useCallback((p: number) => setPage(p), []);

  useEffect(() => {
    trackRef.current?.style.setProperty('--tst-slide', String(active));
  }, [active]);

  useEffect(() => {
    if (!autoplayMs || pageCount < 2) return;
    const id = window.setInterval(() => {
      if (!paused.current) setPage((p) => p + 1);
    }, autoplayMs);
    return () => window.clearInterval(id);
  }, [autoplayMs, pageCount]);

  return (
    <section
      aria-label={t('aria.reviews.section', 'Traveler stories')}
      className="bg-gradient-to-b from-white from-40% to-sand py-section"
    >
      <div className="container max-w-content">

        {/* Header */}
        <div className="mx-auto mb-[clamp(44px,5vw,76px)] max-w-180 text-center">
          <h2 className="text-h3 md:text-h2 font-display text-dark">{heading}</h2>
          <p className="mt-4 text-base text-dark/70">{subheading}</p>
        </div>

        {/* Carousel */}
        <div
          className="overflow-hidden"
          onMouseEnter={() => (paused.current = true)}
          onMouseLeave={() => (paused.current = false)}
        >
          <div
            ref={trackRef}
            className="tst-track flex will-change-transform"
          >
            {pages.map((chunk, p) => (
              <div key={p} aria-hidden={p !== active} className="w-full shrink-0" data-tst-active={p === active}>
                <ul
                  role="list"
                  className="mx-auto grid max-w-130 grid-cols-1 gap-10
                             lg:max-w-none lg:grid-cols-3 lg:gap-[clamp(24px,3vw,48px)]"
                >
                  {chunk.map((review, i) => (
                    <li
                      key={i}
                    >
                      <figure className="relative px-[clamp(20px,2.4vw,40px)] text-center">
                        <StarRating rating={review.rating} idPrefix={`p${p}-${i}`} />

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
                          <figcaption className="relative z-10 flex items-center justify-center gap-2.5 font-body font-medium text-base text-dark/75">
                            <span>{review.name}</span>
                            <span aria-hidden="true" className="text-dark/30">·</span>
                            <span role="img" aria-label={review.country} className="text-lg leading-none">
                              {review.flag}
                            </span>
                            <span aria-hidden="true" className="text-dark/30">·</span>
                            <span>{review.date}</span>
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
            ))}
          </div>
        </div>

        {/* Nav + progress dots */}
        {pageCount > 1 && (
          <div className="mt-[clamp(36px,4vw,52px)] flex items-center justify-center gap-4.5">
            <NavButton
              label={t('aria.reviews.prev', 'Previous stories')}
              dir="prev"
              onClick={() => go(page - 1)}
            />
            <NavButton
              label={t('aria.reviews.next', 'Next stories')}
              dir="next"
              onClick={() => go(page + 1)}
            />
          </div>
        )}

        {/* CTAs */}
        <div className="mt-[clamp(40px,5vw,64px)] flex flex-wrap justify-center gap-4">
          <a
            href={primaryCtaHref}
            className="inline-block rounded-full bg-primary px-10 py-4 font-display text-btn text-white
                       shadow-card-m transition-[background-color,transform] hover:bg-primary/90"
          >
            {primaryCtaLabel ?? t('reviews.cta_primary', 'Book the Journey Now')}
          </a>
          <a
            href={secondaryCtaHref}
            className="inline-block rounded-full border border-dark/15 bg-white px-10 py-4 font-display text-btn text-dark
                       shadow-card-m transition-[border-color,color,transform] hover:border-primary hover:text-primary"
          >
            {secondaryCtaLabel ?? t('reviews.cta_secondary', 'Read all Reviews →')}
          </a>
        </div>

      </div>

    </section>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function NavButton({
  label,
  dir,
  onClick,
}: {
  label: string;
  dir: 'prev' | 'next';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-dark text-white
                 transition-[background-color,transform] hover:scale-105 hover:bg-primary"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={dir === 'prev' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
      </svg>
    </button>
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

export default Testimonials;
