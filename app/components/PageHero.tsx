import {SafeImage} from './SafeImage';

export interface PageHeroProps {
  /** Already resolved by the caller: Shopify value, then a t() fallback. */
  heading: string;
  subtext?: string;
  image?: string;
  imageAlt?: string;
  /** Labels the landmark for screen readers. */
  ariaLabel: string;
  /**
   * `eager` where the hero is the page's first paint. The booking page keeps
   * `lazy`, which is what it shipped with.
   */
  loading?: 'eager' | 'lazy';
}

/**
 * The full-bleed hero introduced on the booking page, shared verbatim by
 * /contact, /faq, /reviews and /blog so all five open the same way.
 *
 * SiteNavbar is absolutely positioned over it. No top padding is needed to
 * clear it: the copy is centered inside a 600px box, which leaves the navbar
 * sitting in the empty upper third.
 *
 * The gradient is transparent for the first 60% and resolves to sand, so the
 * section below has to start on sand too or a seam shows at the join.
 */
export function PageHero({
  heading,
  subtext,
  image,
  imageAlt = '',
  ariaLabel,
  loading = 'lazy',
}: PageHeroProps) {
  return (
    <section aria-label={ariaLabel} className="relative overflow-hidden">
      <SafeImage
        src={image}
        alt={imageAlt}
        className="absolute inset-0 h-full w-full object-cover"
        loading={loading}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-linear-to-b from-transparent from-60% to-sand"
      />
      <div className="relative z-20 flex min-h-150 flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-hero max-w-180 text-white">{heading}</h1>
        {subtext && (
          <p className="mt-8 text-lg text-white md:text-h3 max-w-90">{subtext}</p>
        )}
      </div>
    </section>
  );
}

export default PageHero;
