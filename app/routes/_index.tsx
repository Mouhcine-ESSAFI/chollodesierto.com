import {metaT} from '~/lib/ui-strings';
import {useLoaderData} from 'react-router';
import type {LoaderFunctionArgs, MetaFunction} from 'react-router';
import {SiteNavbar} from '~/components/SiteNavbar';
import {Hero} from '~/components/Hero';
import {TrustBar} from '~/components/TrustBar';
import {WhyChooseUs} from '~/components/WhyChooseUs';
import {TourRoutes} from '~/components/TourRoutes';
import {Journey} from '~/components/Journey';
import {CampTiers} from '~/components/CampTiers';
import {CapturedByTribe} from '~/components/CapturedByTribe';
import {Included} from '~/components/Included';
import {BookingCTA} from '~/components/BookingCTA';
import {SiteFooter} from '~/components/SiteFooter';
import {Testimonials} from '~/components/Testimonials';
import {Faq} from '~/components/Faq';
// The Storefront queries (TOUR_ROUTES_QUERY, CAMP_TIERS_QUERY, FAQS_QUERY,
// REVIEWS_QUERY) still live in ~/lib/queries and are the swap-back target — only
// the mappers are imported here for now, since the Admin response shape matches.
import {mapToTourRoutes, mapToCampTiers} from '~/lib/queries';
import {
  SF_TOUR_ROUTES_QUERY,
  SF_CAMP_TIERS_QUERY,
  SF_FAQS_QUERY,
  SF_REVIEWS_QUERY,
  SF_JOURNEY_DAYS_QUERY,
  SF_CHECKLIST_QUERY,
  SF_VALUE_PROPS_QUERY,
  SF_COMPARISON_QUERY,
  SF_GALLERY_QUERY,
  SF_SITE_SETTINGS_QUERY,
  SF_TOUR_PRODUCT_QUERY,
  SF_PAGE_SECTIONS_QUERY,
  mapRoutePrices,
  mapPageSections,
  mapFaqs,
  mapReviews,
  mapJourneyDays,
  mapChecklist,
  mapReasons,
  mapValueProps,
  mapComparisonRows,
  mapGallery,
  mapSiteSettings,
} from '~/lib/admin-queries';

// Used only when site_settings has no value. Matched by handle rather than
// gid: metaobject ids differ per store, and a stale one silently empties the
// section. The live values come from Admin — see add-handle-settings.mjs.
const JOURNEY_ROUTE_FALLBACK = 'grand-crossing';
const TOUR_PRODUCT_FALLBACK = '3-day-sahara-tour';

// TrustBar renders inline SVGs keyed by these names, so an unrecognised icon
// from the metaobject has to be narrowed to a known one.
const TRUST_ICONS = ['check', 'star', 'heart'] as const;
type TrustIcon = (typeof TRUST_ICONS)[number];
const toTrustIcon = (s: string): TrustIcon =>
  (TRUST_ICONS as readonly string[]).includes(s) ? (s as TrustIcon) : 'check';

export const meta: MetaFunction = ({matches}) => {
  const t = metaT(matches);
  return [
    {title: t('meta.home.title', 'Budget Desert Tour — 3-Day Marrakech to Sahara from €85')},
    {
      name: 'description',
      content: t(
        'meta.home.description',
        '3-day small group desert tour from Marrakech to the Sahara. Real Berber camp, camel trek, fair price from €85.',
      ),
    },
  ];
};

export async function loader({context}: LoaderFunctionArgs) {
  const {storefront} = context;

  // Settings first: they carry the catalogue handles the product query needs.
  // One extra round trip, in exchange for a second store being pure Admin
  // configuration rather than a code fork.
  const settingsRes = await storefront.query(SF_SITE_SETTINGS_QUERY).catch(() => null);
  const settings = mapSiteSettings(settingsRes);
  const tourHandle = settings?.tourProductHandle || TOUR_PRODUCT_FALLBACK;
  const journeyHandle = settings?.journeyRouteHandle || JOURNEY_ROUTE_FALLBACK;

  const [
    routesRes,
    campsRes,
    faqsRes,
    reviewsRes,
    journeyRes,
    checklistRes,
    valuePropsRes,
    comparisonRes,
    galleryRes,
    productRes,
    sectionsRes,
  ] = await Promise.all([
    storefront.query(SF_TOUR_ROUTES_QUERY).catch(() => null),
    storefront.query(SF_CAMP_TIERS_QUERY).catch(() => null),
    storefront.query(SF_FAQS_QUERY).catch(() => null),
    storefront.query(SF_REVIEWS_QUERY).catch(() => null),
    storefront.query(SF_JOURNEY_DAYS_QUERY).catch(() => null),
    storefront.query(SF_CHECKLIST_QUERY).catch(() => null),
    storefront.query(SF_VALUE_PROPS_QUERY).catch(() => null),
    storefront.query(SF_COMPARISON_QUERY).catch(() => null),
    storefront.query(SF_GALLERY_QUERY).catch(() => null),
    storefront
      .query(SF_TOUR_PRODUCT_QUERY, {variables: {handle: tourHandle}})
      .catch(() => null),
    storefront.query(SF_PAGE_SECTIONS_QUERY).catch(() => null),
  ]);

  const routePrices = mapRoutePrices(productRes);
  const routes = mapToTourRoutes(routesRes, routePrices);
  const journeyDays = mapJourneyDays(journeyRes, journeyHandle);
  const sections = mapPageSections(sectionsRes);

  return {
    // Route prices come from the cheapest variant per Route option. If that
    // lookup fails the mapper falls back to 0, so don't advertise "€0" routes.
    routes:  routes.every((r) => r.price !== '€0') ? routes : [],
    camps:   mapToCampTiers(campsRes),
    faqs:    mapFaqs(faqsRes, 'general'),
    // Filtered by placement, not "every review" — otherwise the day-specific
    // journey quotes and the camp/included ones leak into the general carousel,
    // and the Placement field the schema documents does nothing here.
    reviews: mapReviews(reviewsRes, 'home'),
    // Journey renders day.review.rating unguarded, so a day without a linked
    // review would crash it. Missing images are fine now — ImageCarousel
    // returns null when there are none.
    journeyDays:
      journeyDays.length && journeyDays.every((d) => d.review)
        ? journeyDays.map((d) => ({...d, review: d.review!}))
        : [],
    included:    mapChecklist(checklistRes, 'included'),
    bring:       mapChecklist(checklistRes, 'bring'),
    reasons:     mapReasons(valuePropsRes),
    trust:       mapValueProps(valuePropsRes, 'trust').map((v) => ({
      ...v,
      icon: toTrustIcon(v.icon),
    })),
    comparison:  mapComparisonRows(comparisonRes),
    gallery:     mapGallery(galleryRes),
    whyUsReview:     mapReviews(reviewsRes, 'why_us')[0] ?? null,
    campReview:      mapReviews(reviewsRes, 'camp')[0] ?? null,
    includedReview:  mapReviews(reviewsRes, 'included')[0] ?? null,
    settings,
    sections,
  };
}

export default function Homepage() {
  const {
    routes,
    camps,
    faqs,
    reviews,
    journeyDays,
    included,
    bring,
    reasons,
    trust,
    comparison,
    gallery,
    whyUsReview,
    campReview,
    includedReview,
    settings,
    sections,
  } = useLoaderData<typeof loader>();

  return (
    <>
      <SiteNavbar />
      <main id="main-content">
        <Hero
          ratingValue={settings?.ratingValue || undefined}
          ratingCountLabel={settings?.ratingCountLabel || undefined}
        />
        <TrustBar
          poster={sections['home.trust']?.image?.url || undefined}
          posterAlt={sections['home.trust']?.image?.alt || undefined}
          videoUrl={sections['home.trust']?.videoUrl || undefined}
          features={trust.length ? trust : undefined}
        />
        {/* Section copy comes from `page_section` metaobjects, keyed by name.
            Each prop falls back to the component default when the field is blank. */}
        <WhyChooseUs
          heading={sections['home.why_us']?.heading || undefined}
          reasons={reasons.length ? reasons : undefined}
          review={whyUsReview ?? undefined}
        />
        <TourRoutes
          eyebrow={sections['home.routes']?.eyebrow || undefined}
          heading={sections['home.routes']?.heading || undefined}
          subheading={
            sections['home.routes']?.subheading.length
              ? sections['home.routes'].subheading
              : undefined
          }
          routes={routes.length ? routes : undefined}
        />
        <Journey
          heading={sections['home.journey']?.heading || undefined}
          intro={sections['home.journey']?.subheading[0] || undefined}
          quote={sections['home.journey']?.quote || undefined}
          days={journeyDays.length ? journeyDays : undefined}
        />
        <CampTiers
          eyebrow={sections['home.camps']?.eyebrow || undefined}
          heading={sections['home.camps']?.heading || undefined}
          subheading={
            sections['home.camps']?.subheading.length
              ? sections['home.camps'].subheading
              : undefined
          }
          camps={camps.length ? camps : undefined}
          review={campReview ?? undefined}
        />
        <CapturedByTribe
          heading={sections['home.gallery']?.heading || undefined}
          subheading={sections['home.gallery']?.subheading[0] || undefined}
          media={gallery.length ? gallery : undefined}
          handle={settings?.instagramHandle || undefined}
        />
        <Included
          heading={sections['home.included']?.heading || undefined}
          subheading={sections['home.included']?.subheading[0] || undefined}
          includedTitle={sections['home.included']?.labelPrimary || undefined}
          bringTitle={sections['home.included']?.labelSecondary || undefined}
          included={included.length ? included : undefined}
          bring={bring.length ? bring : undefined}
          review={includedReview ?? undefined}
        />
        <BookingCTA
          eyebrow={sections['home.comparison']?.eyebrow || undefined}
          heading={sections['home.comparison']?.heading || undefined}
          subheading={sections['home.comparison']?.subheading[0] || undefined}
          usualLabel={sections['home.comparison']?.labelPrimary || undefined}
          oursLabel={sections['home.comparison']?.labelSecondary || undefined}
          rows={comparison.length ? comparison : undefined}
        />
        <Testimonials
          heading={sections['home.testimonials']?.heading || undefined}
          subheading={sections['home.testimonials']?.subheading[0] || undefined}
          reviews={reviews.length ? reviews : undefined}
        />
        <Faq
          heading={sections['home.faq']?.heading || undefined}
          faqs={faqs.length ? faqs : undefined}
        />
      </main>
      <SiteFooter />
    </>
  );
}
