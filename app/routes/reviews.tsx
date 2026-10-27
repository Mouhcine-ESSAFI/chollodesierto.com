import {useLoaderData} from 'react-router';
import type {LoaderFunctionArgs, MetaFunction} from 'react-router';
import {SiteNavbar} from '~/components/SiteNavbar';
import {PageHero} from '~/components/PageHero';
import {Reviews} from '~/components/Reviews';
import {SiteFooter} from '~/components/SiteFooter';
import {
  SF_REVIEWS_QUERY,
  SF_PAGE_SECTIONS_QUERY,
  mapReviews,
  mapPageSections,
} from '~/lib/admin-queries';
import {metaT, useT} from '~/lib/ui-strings';

export const meta: MetaFunction = ({matches}) => {
  const t = metaT(matches);
  return [
    {title: t('meta.reviews.title', 'Traveler Reviews — Budget Desert Tour')},
    {
      name: 'description',
      content: t(
        'meta.reviews.description',
        'Read honest reviews from travelers who joined our 3-day Sahara desert tour from Marrakech.',
      ),
    },
  ];
};

export async function loader({context}: LoaderFunctionArgs) {
  const {storefront} = context;

  const [reviewsRes, sectionsRes] = await Promise.all([
    storefront.query(SF_REVIEWS_QUERY).catch(() => null),
    storefront.query(SF_PAGE_SECTIONS_QUERY).catch(() => null),
  ]);

  const sections = mapPageSections(sectionsRes);

  return {
    reviews: mapReviews(reviewsRes, 'reviews'),
    section: sections['reviews.index'] ?? null,
    hero: sections['reviews.hero'] ?? null,
    // Each page hero falls back to the booking hero's photo until its own
    // `page_section` image is set in Admin.
    heroFallback: sections['booking.hero']?.image ?? null,
  };
}

export default function ReviewsPage() {
  const {reviews, section, hero, heroFallback} = useLoaderData<typeof loader>();
  const t = useT();

  return (
    <>
      <SiteNavbar />
      <main id="main-content">
        <PageHero
          ariaLabel={t('aria.reviews.hero', 'Traveler reviews')}
          heading={hero?.heading || t('reviews.hero_heading', 'Straight from the camp.')}
          subtext={
            hero?.subheading[0] ||
            t(
              'reviews.hero_subtext',
              'Unfiltered words from people who actually made the trip.',
            )
          }
          image={hero?.image?.url || heroFallback?.url || undefined}
          imageAlt={hero?.image?.alt || heroFallback?.alt || ''}
          loading="eager"
        />
        <Reviews
          heading={section?.heading || undefined}
          subheading={section?.subheading[0] || undefined}
          reviews={reviews.length ? reviews : undefined}
          flush
        />
      </main>
      <SiteFooter />
    </>
  );
}
