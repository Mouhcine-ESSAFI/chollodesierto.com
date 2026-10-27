import {PageHero} from './PageHero';
import {useT} from '~/lib/ui-strings';

// Props mirror the Shopify `page_section` entry "booking.hero" that drives it.
export interface BookingHeroProps {
  headline?: string;
  subtext?: string;
  image?: string;
  imageAlt?: string;
}

/**
 * The booking page's opening section. The markup now lives in PageHero, which
 * /contact, /faq, /reviews and /blog share — this keeps the booking page's own
 * copy defaults and image fallback.
 */
export function BookingHero({
  headline,
  subtext,
  image = 'https://images.unsplash.com/photo-1542401886-65d6c61db217?auto=format&fit=crop&w=1800&q=80',
  imageAlt = 'Golden Sahara sand dunes at sunset',
}: BookingHeroProps) {
  const t = useT();
  return (
    <PageHero
      ariaLabel={t('aria.booking.hero', 'Book your adventure')}
      heading={headline || t('booking.hero_heading', 'Book your adventure.')}
      subtext={
        subtext ||
        t(
          'booking.hero_subtext',
          "Five quick choices, and you're going. We'll handle the rest.",
        )
      }
      image={image}
      imageAlt={imageAlt}
    />
  );
}

export default BookingHero;
