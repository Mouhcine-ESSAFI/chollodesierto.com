import {metaT} from '~/lib/ui-strings';
import {data, redirect, useLoaderData} from 'react-router';
import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from 'react-router';
import {SiteNavbar} from '~/components/SiteNavbar';
import {BookingHero} from '~/components/BookingHero';
import {BookingBody} from '~/components/BookingBody';
import {Testimonials} from '~/components/Testimonials';
import {SiteFooter} from '~/components/SiteFooter';
import {
  TOUR_ROUTES_QUERY,
  mapToBookingRoutes,
  mapToBookingCamps,
} from '~/lib/queries';
import {
  SF_CAMP_TIERS_QUERY,
  SF_REVIEWS_QUERY,
  SF_FAQS_QUERY,
  SF_CHECKLIST_QUERY,
  SF_TOUR_PRODUCT_QUERY,
  SF_PAGE_SECTIONS_QUERY,
  SF_SITE_SETTINGS_QUERY,
  SF_ADDON_PRODUCT_QUERY,
  mapReviews,
  mapBookingFaqs,
  mapPriceIncludes,
  mapRoutePrices,
  mapPageSections,
  mapBookingExtras,
  mapBookingTransfer,
  mapSiteSettings,
  resolveTourType,
} from '~/lib/admin-queries';

// Used only when site_settings has no value. The live handles come from
// Admin so a second store can sell its own catalogue — see
// add-handle-settings.mjs.
const TOUR_PRODUCT_FALLBACK = '3-day-sahara-tour';
const QUAD_PRODUCT_FALLBACK = 'quad-bike-rental';
const TRANSFER_PRODUCT_FALLBACK = 'airport-transfer';
// Draft Order checkout is retired — see the DISABLED block in the action.
// import {createDraftOrder} from '~/lib/draft-order';

export const meta: MetaFunction = ({matches}) => {
  const t = metaT(matches);
  return [
    {title: t('meta.booking.title', 'Book Your Desert Tour — Budget Desert Tour')},
    {
      name: 'description',
      content: t(
        'meta.booking.description',
        'Book your 3-day Sahara desert tour from €85. Reserve with just 20% deposit. Free cancellation up to 48 hours before departure.',
      ),
    },
  ];
};

export async function loader({context, request}: LoaderFunctionArgs) {
  const {storefront} = context;
  // Route cards on the homepage link to /booking?route=<handle>.
  const requestedRoute = new URL(request.url).searchParams.get('route') ?? '';

  // Settings first: they carry the catalogue handles the product queries need.
  // One extra round trip, in exchange for a second store being pure Admin
  // configuration rather than a code fork.
  const settingsRes = await storefront.query(SF_SITE_SETTINGS_QUERY).catch(() => null);
  const settings = mapSiteSettings(settingsRes);
  const tourHandle = settings?.tourProductHandle || TOUR_PRODUCT_FALLBACK;
  const quadHandle = settings?.quadProductHandle || QUAD_PRODUCT_FALLBACK;
  const transferHandle = settings?.transferProductHandle || TRANSFER_PRODUCT_FALLBACK;

  const [
    campsRes,
    reviewsRes,
    faqsRes,
    checklistRes,
    routesRes,
    productRes,
    sectionsRes,
    quadRes,
    transferRes,
  ] = await Promise.all([
    storefront.query(SF_CAMP_TIERS_QUERY).catch(() => null),
    storefront.query(SF_REVIEWS_QUERY).catch(() => null),
    storefront.query(SF_FAQS_QUERY).catch(() => null),
    storefront.query(SF_CHECKLIST_QUERY).catch(() => null),
    storefront.query(TOUR_ROUTES_QUERY).catch(() => null),
    storefront
      .query(SF_TOUR_PRODUCT_QUERY, {variables: {handle: tourHandle}})
      .catch(() => null),
    storefront.query(SF_PAGE_SECTIONS_QUERY).catch(() => null),
    storefront
      .query(SF_ADDON_PRODUCT_QUERY, {variables: {handle: quadHandle}})
      .catch(() => null),
    storefront
      .query(SF_ADDON_PRODUCT_QUERY, {variables: {handle: transferHandle}})
      .catch(() => null),
  ]);

  // Route prices come from the cheapest variant per Route option, since
  // tour_route has no price field. A zero here would break the booking total,
  // so fall back to the component's own routes if the lookup came up empty.
  //
  // Sorted by price, not by sort_order: sort_order drives the homepage's
  // side/featured/side card layout (reverse, classic, grand), which would make
  // the booking form default to the most expensive route. The hardcoded routes
  // this replaces were price-ascending, so keep that.
  const routes = mapToBookingRoutes(routesRes, mapRoutePrices(productRes)).sort(
    (a, b) => a.price - b.price,
  );

  return {
    requestedRoute,
    routes:       routes.every((r) => r.price > 0) ? routes : [],
    camps:        mapToBookingCamps(campsRes),
    reviews:      mapReviews(reviewsRes, 'booking'),
    bookingFaqs:  mapBookingFaqs(faqsRes),
    priceIncludes: mapPriceIncludes(checklistRes),
    sections:     mapPageSections(sectionsRes),
    // The eyebrow is a ui_string, not product data — the component runs it
    // through t() so it translates with everything else.
    extras:       mapBookingExtras(quadRes, 'Per quad'),
    transfer:     mapBookingTransfer(transferRes),
    // Sent with every cart line as `_tour_type` for the booking backend.
    tourType:     resolveTourType(productRes, settings?.tourType),
  };
}

/** A cart line's booking details, forwarded to Shopify as line item properties. */
type LineAttribute = {key: string; value: string};

/** Caps a single attribute so a crafted payload can't push an unbounded string. */
const MAX_ATTRIBUTE_VALUE = 500;
const MAX_ATTRIBUTES_PER_LINE = 12;

function isAttribute(a: unknown): a is LineAttribute {
  if (typeof a !== 'object' || a === null) return false;
  const {key, value} = a as Record<string, unknown>;
  return (
    typeof key === 'string' &&
    key.length > 0 &&
    key.length <= 100 &&
    typeof value === 'string' &&
    value.length <= MAX_ATTRIBUTE_VALUE
  );
}

function isCartLine(
  line: unknown,
): line is {merchandiseId: string; quantity: number; attributes?: LineAttribute[]} {
  if (typeof line !== 'object' || line === null) return false;
  const {merchandiseId, quantity, attributes} = line as Record<string, unknown>;
  if (
    typeof merchandiseId !== 'string' ||
    !merchandiseId.startsWith('gid://shopify/ProductVariant/') ||
    typeof quantity !== 'number' ||
    !Number.isInteger(quantity) ||
    quantity <= 0 ||
    quantity > 17
  ) {
    return false;
  }
  if (attributes === undefined) return true;
  return (
    Array.isArray(attributes) &&
    attributes.length <= MAX_ATTRIBUTES_PER_LINE &&
    attributes.every(isAttribute)
  );
}

export async function action({request, context}: ActionFunctionArgs) {
  const {cart} = context;

  const formData = await request.formData();

  if (formData.get('intent') !== 'create-cart') {
    return data({error: 'Unknown action.'}, {status: 400});
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(String(formData.get('lines') ?? '[]'));
  } catch {
    return data({error: 'Invalid booking data. Please try again.'}, {status: 400});
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return data({error: 'Select a route and camp before reserving.'}, {status: 400});
  }

  if (!parsed.every(isCartLine)) {
    return data(
      {error: 'Something looked off with your booking. Please try again.'},
      {status: 400},
    );
  }

  // ── ACTIVE: Storefront cart checkout ─────────────────────────────────────
  // Restored once the Storefront API became available. Verified end-to-end:
  // cart.create() returns a real checkoutUrl and that URL loads a live Shopify
  // checkout page.
  //
  // storefront.mutation throws on transport/API failures rather than returning
  // them in `errors`, so the whole call needs guarding.
  let result;
  try {
    result = await cart.create({lines: parsed});
  } catch (error) {
    console.error('Cart create threw:', error);
    return data(
      {error: 'We could not start checkout — please try again or WhatsApp us.'},
      {status: 500},
    );
  }

  if (result.errors?.length || result.userErrors?.length) {
    console.error('Cart create failed:', result.errors, result.userErrors);
    return data(
      {error: 'We could not start checkout — please try again or WhatsApp us.'},
      {status: 500},
    );
  }

  const checkoutUrl = result.cart?.checkoutUrl;
  if (!checkoutUrl) {
    return data(
      {error: 'Checkout is unavailable right now. Please try again.'},
      {status: 500},
    );
  }

  // Forward the cart-id cookie or checkout won't recognize the new cart.
  return redirect(checkoutUrl, {headers: cart.setCartId(result.cart.id)});

  // ─────────────────────────────────────────────────────────────
  // DISABLED — Draft Order workaround, kept for reference. It was only needed
  // while the Storefront API was unavailable, and it no longer works anyway:
  // the current Admin token has no scopes. Restoring it would need
  // `const {storefront} = context;` at the top of this action and the
  // createDraftOrder import re-enabled.
  // ─────────────────────────────────────────────────────────────
  //
  // let result;
  // try {
  //   result = await createDraftOrder(env, parsed);
  // } catch (error) {
  //   console.error('Draft order threw:', error);
  //   return data({error: '…'}, {status: 500});
  // }
  // if (result.userErrors?.length) {
  //   console.error('Draft order failed:', result.userErrors);
  //   return data({error: '…'}, {status: 500});
  // }
  // const invoiceUrl = result.draftOrder?.invoiceUrl;
  // if (!invoiceUrl) return data({error: '…'}, {status: 500});
  // return redirect(invoiceUrl);
}

export default function BookPage() {
  const {
    routes,
    camps,
    reviews,
    bookingFaqs,
    priceIncludes,
    requestedRoute,
    sections,
    extras,
    transfer,
    tourType,
  } = useLoaderData<typeof loader>();

  return (
    <>
      <SiteNavbar />
      <main id="main-content">
        <BookingHero
          headline={sections['booking.hero']?.heading || undefined}
          subtext={sections['booking.hero']?.subheading[0] || undefined}
          image={sections['booking.hero']?.image?.url || undefined}
          imageAlt={sections['booking.hero']?.image?.alt || undefined}
        />
        <BookingBody
          initialRouteId={requestedRoute || undefined}
          routes={routes.length ? routes : undefined}
          camps={camps.length ? camps : undefined}
          faqs={bookingFaqs.length ? bookingFaqs : undefined}
          priceIncludes={priceIncludes.length ? priceIncludes : undefined}
          extras={extras.length ? extras : undefined}
          transfer={transfer ?? undefined}
          tourType={tourType}
        />
        <Testimonials reviews={reviews.length ? reviews : undefined} />
      </main>
      <SiteFooter />
    </>
  );
}
