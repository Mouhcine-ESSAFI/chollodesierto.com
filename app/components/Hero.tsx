import {useT} from '~/lib/ui-strings';
import dunesSvg from '~/assets/dunes.svg?url';
import sunSvg from '~/assets/sun.svg?url';
import sunlightSvg from '~/assets/sunlight.svg?url';

export interface HeroProps {
  /** Rating shown in the social-proof line, e.g. "4.9". */
  ratingValue?: string;
  /** Label after the rating, e.g. "Trusted by 3k+ people." */
  ratingCountLabel?: string;
}

export function Hero({
  ratingValue = '4.9',
  ratingCountLabel = 'Trusted by 3k+ people.',
}: HeroProps = {}) {
  const t = useT();

  return (
    <section
      aria-labelledby="hero-heading"
      className="hero-bg relative w-full min-h-[80vh] overflow-hidden flex items-center"
    >
      {/* Layer 4 — Sunlight */}
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 z-4 pointer-events-none h-full flex items-end">
        <img src={sunlightSvg} alt="" className="w-full h-full max-h-180 lg:max-h-212 object-cover" />
      </div>

      {/* Layer 3 — Warm bottom gradient */}
      <div aria-hidden="true" className="hero-gradient absolute inset-x-0 bottom-0 z-6 pointer-events-none h-full" />

      {/* Layer 2 — Sun */}
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 z-8 pointer-events-none h-full flex items-end">
        <img src={sunSvg} alt="" className="w-full h-full max-h-180 lg:max-h-212 object-cover" />
      </div>

      {/* Layer 1 — Dunes (frontmost) */}
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 z-10 pointer-events-none">
        <img src={dunesSvg} alt="" className="w-full h-60 lg:h-42 object-cover object-bottom" />
      </div>

      {/* Content — above all layers */}
      <div className="relative z-20 w-full flex flex-col items-center text-center py-28 px-4">
        <h1 id="hero-heading" className="font-display text-hero text-sand pb-6 max-w-110 lg:max-w-185 whitespace-pre-line">
          {t('hero.heading', "The Epic 3-Day Desert Tour.\nA Story That Won't Let You Go.")}
        </h1>
        <p className="font-body text-lg md:text-xl text-sand pb-12 whitespace-pre-line">
          {t('hero.subtext', 'Marrakech to the Sahara and back.\nSmall group, real Berber camp, fair price.\n')}
          <span className="price-underline font-display text-sand">{t('hero.price', '€85')}</span>
          {t('hero.subtext_after_price', '. And the Sahara becomes yours.')}
        </p>
        <div className="flex flex-wrap gap-3.5 justify-center mb-6">
          <a
            href="/booking"
            className="font-display text-btn bg-primary text-sand px-8 py-3.5 rounded-full hover:opacity-90 transition-opacity"
          >
            {t('hero.cta_primary', 'Book Your Adventure →')}
          </a>
          <a
            href="#journey"
            className="font-display text-btn bg-white/10 text-sand px-8 py-3.5 rounded-full border border-sand/30 hover:bg-white/15 transition-colors"
          >
            {t('hero.cta_secondary', 'Watch the Journey ↓')}
          </a>
        </div>

        <p className="flex items-center gap-2 font-body text-author text-sand">
          
          <span>{ratingValue} <span aria-hidden="true" className="text-primary">★</span> {ratingCountLabel}</span>
        </p>
      </div>
    </section>
  );
}
