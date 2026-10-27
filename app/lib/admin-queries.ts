// Storefront metaobject queries + mappers for the content types that have no
// query in app/lib/queries.ts (which holds the original four: tour_route,
// camp_tier, faq_item, review).
//
// These were originally written against the Admin API as a workaround while the
// Storefront API was unavailable. The `metaobjects(type:) { nodes { fields } }`
// shape is identical on both, so they now run through context.storefront.query()
// unchanged — only the client differs. The mapTo* mappers in queries.ts are
// reused as-is for the original four types.

// ── Queries for types that already have mappers in queries.ts ────────────────

export const SF_TOUR_ROUTES_QUERY = `
  query AdminTourRoutes {
    metaobjects(type: "tour_route", first: 10) {
      nodes {
        id
        handle
        fields {
          key
          value
          reference { ... on MediaImage { image { url altText } } }
        }
      }
    }
  }
`;

export const SF_CAMP_TIERS_QUERY = `
  query AdminCampTiers {
    metaobjects(type: "camp_tier", first: 10) {
      nodes {
        id
        handle
        fields {
          key
          value
          reference { ... on MediaImage { image { url altText } } }
        }
      }
    }
  }
`;

export const SF_FAQS_QUERY = `
  query AdminFaqs {
    metaobjects(type: "faq_item", first: 50) {
      nodes { id handle fields { key value } }
    }
  }
`;

export const SF_REVIEWS_QUERY = `
  query AdminReviews {
    metaobjects(type: "review", first: 50) {
      nodes { id handle fields { key value } }
    }
  }
`;

// ── Queries for the newly populated types ────────────────────────────────────

export const SF_CHECKLIST_QUERY = `
  query AdminChecklist {
    metaobjects(type: "checklist_item", first: 50) {
      nodes { id handle fields { key value } }
    }
  }
`;

export const SF_VALUE_PROPS_QUERY = `
  query AdminValueProps {
    metaobjects(type: "value_prop", first: 50) {
      nodes { id handle fields { key value } }
    }
  }
`;

export const SF_COMPARISON_QUERY = `
  query AdminComparison {
    metaobjects(type: "comparison_row", first: 20) {
      nodes { id handle fields { key value } }
    }
  }
`;

export const SF_PARTNERS_QUERY = `
  query AdminPartners {
    metaobjects(type: "partner", first: 20) {
      nodes {
        id
        handle
        fields {
          key
          value
          reference { ... on MediaImage { image { url altText } } }
        }
      }
    }
  }
`;

export const SF_GALLERY_QUERY = `
  query AdminGallery {
    metaobjects(type: "gallery_item", first: 20) {
      nodes {
        id
        handle
        fields {
          key
          value
          reference { ... on MediaImage { image { url altText } } }
        }
      }
    }
  }
`;

// Online Store navigation. The Storefront API takes a handle directly (unlike
// the Admin API, where `menu` takes an id and you list via `menus`).
export const SF_MENUS_QUERY = `#graphql
  query SfMenu($handle: String!) {
    menu(handle: $handle) {
      id
      title
      items { id title url }
    }
  }
`;

// Section copy — headings, eyebrows and page prose, keyed by e.g. "about.story"
// or "home.camps". One query returns every section; routes pick what they need.
export const SF_PAGE_SECTIONS_QUERY = `#graphql
  query SfPageSections {
    metaobjects(type: "page_section", first: 100) {
      nodes {
        id
        handle
        fields {
          key
          value
          reference { ... on MediaImage { image { url altText } } }
          references(first: 10) {
            nodes { ... on MediaImage { image { url altText } } }
          }
        }
      }
    }
  }
`;

export const SF_JOURNEY_DAYS_QUERY = `#graphql
  query SfJourneyDays {
    metaobjects(type: "journey_day", first: 50) {
      nodes {
        id
        handle
        fields {
          key
          value
          reference {
            ... on MediaImage { image { url altText } }
            ... on Metaobject { handle fields { key value } }
          }
          references(first: 5) {
            nodes { ... on MediaImage { image { url altText } } }
          }
        }
      }
    }
  }
`;

// The tour product behind every route. Route base price = the cheapest variant
// for that Route option value, since tour_route carries no price of its own.
export const SF_TOUR_PRODUCT_QUERY = `#graphql
  query SfTourProduct($handle: String!) {
    product(handle: $handle) {
      id
      # The JoyPlatform backend reads productType as the tour-type fallback and
      # expects Private / Shared (or a recognised translation).
      productType
      variants(first: 100) {
        nodes {
          price { amount currencyCode }
          selectedOptions { name value }
        }
      }
    }
  }
`;

/**
 * Tour-type values the JoyPlatform backend maps to Private / Shared. Anything
 * else it cannot classify, so the storefront falls back rather than sending a
 * value that would be silently dropped.
 */
const TOUR_TYPES = [
  'private', 'shared',
  'privado', 'privé', 'privato',
  'compartido', 'grupo', 'partagé', 'condiviso',
];

/**
 * The value sent as the `_tour_type` line-item property.
 *
 * Prefers the product's own type, since that is what the backend treats as the
 * source of truth — but only when it is a value the backend recognises. This
 * store's productType is "Tour", which it cannot map, so the Admin-editable
 * `site_settings.tour_type` is used instead.
 */
export function resolveTourType(productData: unknown, fallback?: string): string {
  const fromProduct = ((productData as any)?.product?.productType ?? '').trim();
  if (fromProduct && TOUR_TYPES.includes(fromProduct.toLowerCase())) return fromProduct;
  const fromSettings = (fallback ?? '').trim();
  if (fromSettings) return fromSettings;
  return 'Shared';
}

// The booking form's optional add-ons. Title, price and photo all come from
// the product, so a non-developer edits them where they'd expect to — under
// Products — and the price shown can't drift from the price charged.
export const SF_ADDON_PRODUCT_QUERY = `#graphql
  query SfAddonProduct($handle: String!) {
    product(handle: $handle) {
      id
      title
      featuredImage { url altText }
      variants(first: 20) {
        nodes {
          id
          title
          availableForSale
          price { amount }
          image { url altText }
        }
      }
    }
  }
`;

export const SF_SITE_SETTINGS_QUERY = `#graphql
  query SfSiteSettings {
    # primaryDomain rides along here so menu URLs can be internalised without a
    # second round trip — Shopify resolves FRONTPAGE menu items to the primary
    # domain, not the myshopify one.
    shop { primaryDomain { host } }
    metaobjects(type: "site_settings", first: 1) {
      nodes {
        id
        handle
        fields {
          key
          value
          # GenericFile as well as MediaImage: Shopify stores an uploaded SVG
          # as a GenericFile, and the logo and favicon are SVGs.
          reference {
            ... on MediaImage { image { url altText } }
            ... on GenericFile { url }
          }
        }
      }
    }
  }
`;

// ── Field helpers (mirrors the private helpers in queries.ts) ────────────────

type MetaField = {
  key: string;
  value: string | null;
  reference?: any;
  /** Populated for list.file_reference / list.metaobject_reference fields. */
  references?: {nodes?: any[]} | null;
};

function nodesOf(data: unknown): any[] {
  return (data as any)?.metaobjects?.nodes ?? [];
}
function f(fields: MetaField[], key: string): string {
  return fields.find((x) => x.key === key)?.value ?? '';
}
function fInt(fields: MetaField[], key: string): number {
  return parseInt(f(fields, key) || '0', 10);
}
function fImg(fields: MetaField[], key: string) {
  const img = fields.find((x) => x.key === key)?.reference?.image;
  return img ? {url: img.url as string, altText: (img.altText as string) ?? ''} : null;
}
/**
 * A file_reference that may hold an SVG. Shopify returns an uploaded SVG as a
 * GenericFile, which has `url` directly and no `image` — so fImg sees nothing.
 */
function fFileUrl(fields: MetaField[], key: string): string {
  const ref = fields.find((x) => x.key === key)?.reference as
    | {url?: string; image?: {url?: string}}
    | undefined;
  return ref?.image?.url ?? ref?.url ?? '';
}
function fList(fields: MetaField[], key: string): string[] {
  const val = f(fields, key);
  if (!val) return [];
  try {
    return JSON.parse(val) as string[];
  } catch {
    return val.split('\n').filter(Boolean);
  }
}
function bySort<T extends {_sort: number}>(rows: T[]) {
  return rows.sort((a, b) => a._sort - b._sort).map(({_sort: _s, ...rest}) => rest);
}

// ── page_section — editable headings and page prose ──────────────────────────

export type PageSection = {
  eyebrow: string;
  /** Prefers heading_lines (multi-line) over heading when both are set. */
  heading: string;
  subheading: string[];
  body: string[];
  bodySecondary: string[];
  statement: string[];
  quote: string;
  author: string;
  labelPrimary: string;
  labelSecondary: string;
  videoUrl: string;
  image: {url: string; alt: string} | null;
  images: Array<{url: string; alt: string}>;
};

/** Paragraphs are separated by blank lines; single newlines stay inside one. */
const paragraphs = (s: string) =>
  s.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
const lines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);

/**
 * Returns a lookup keyed by the section's `key` field ("about.story", …).
 * Every value is fully populated, so callers can read a field without checking
 * whether the section exists — `sections['home.faq']?.heading || fallback`.
 */
export function mapPageSections(data: unknown): Record<string, PageSection> {
  const out: Record<string, PageSection> = {};
  for (const node of nodesOf(data)) {
    const fields: MetaField[] = node.fields;
    const key = f(fields, 'key');
    if (!key) continue;
    const imgNodes: any[] =
      fields.find((x) => x.key === 'images')?.references?.nodes ?? [];
    out[key] = {
      eyebrow: f(fields, 'eyebrow'),
      heading: f(fields, 'heading_lines') || f(fields, 'heading'),
      subheading: lines(f(fields, 'subheading')),
      body: paragraphs(f(fields, 'body')),
      bodySecondary: paragraphs(f(fields, 'body_secondary')),
      statement: lines(f(fields, 'statement')),
      quote: f(fields, 'quote'),
      author: f(fields, 'author'),
      labelPrimary: f(fields, 'label_primary'),
      labelSecondary: f(fields, 'label_secondary'),
      videoUrl: f(fields, 'video_url'),
      image: (() => {
        const i = fImg(fields, 'image');
        return i ? {url: i.url, alt: i.altText} : null;
      })(),
      images: imgNodes
        .filter((n) => n?.image?.url)
        .map((n) => ({url: n.image.url as string, alt: (n.image.altText as string) ?? ''})),
    };
  }
  return out;
}

// ── faq_item — same {q, a} shape as mapToFaqs, plus group filtering ──────────

export function mapFaqs(data: unknown, group?: 'general' | 'booking') {
  const rows = nodesOf(data)
    .map((node) => {
      const fields: MetaField[] = node.fields;
      return {
        q: f(fields, 'question'),
        a: f(fields, 'answer'),
        group: f(fields, 'group'),
        _sort: fInt(fields, 'sort_order'),
      };
    })
    .filter((r) => (group ? r.group === group : true));
  return bySort(rows).map(({group: _g, ...rest}) => rest);
}

// ── faq_item — BookingBody's {question, answer} shape ────────────────────────

export function mapBookingFaqs(data: unknown) {
  return bySort(
    nodesOf(data)
      .map((node) => {
        const fields: MetaField[] = node.fields;
        return {
          question: f(fields, 'question'),
          answer: f(fields, 'answer'),
          group: f(fields, 'group'),
          _sort: fInt(fields, 'sort_order'),
        };
      })
      .filter((r) => r.group === 'booking'),
  ).map(({group: _g, ...rest}) => rest);
}

// ── checklist_item — Included's {icon, iconLabel, text} ──────────────────────

export function mapChecklist(data: unknown, group: 'included' | 'bring') {
  return bySort(
    nodesOf(data)
      .map((node) => {
        const fields: MetaField[] = node.fields;
        return {
          icon: f(fields, 'icon'),
          iconLabel: f(fields, 'icon_label'),
          text: f(fields, 'text'),
          group: f(fields, 'group'),
          _sort: fInt(fields, 'sort_order'),
        };
      })
      .filter((r) => r.group === group),
  ).map(({group: _g, ...rest}) => rest);
}

// ── checklist_item — BookingBody's price grid {icon, title, subtitle} ────────

export function mapPriceIncludes(data: unknown) {
  return bySort(
    nodesOf(data)
      .map((node) => {
        const fields: MetaField[] = node.fields;
        return {
          icon: f(fields, 'icon'),
          title: f(fields, 'text'),
          subtitle: f(fields, 'subtitle'),
          group: f(fields, 'group'),
          _sort: fInt(fields, 'sort_order'),
        };
      })
      .filter((r) => r.group === 'price_grid'),
  ).map(({group: _g, ...rest}) => rest);
}

// ── value_prop — WhyChooseUs {emoji, emojiLabel, title, body} ────────────────

export function mapReasons(data: unknown) {
  return bySort(
    nodesOf(data)
      .map((node) => {
        const fields: MetaField[] = node.fields;
        return {
          emoji: f(fields, 'icon'),
          emojiLabel: f(fields, 'icon_label'),
          title: f(fields, 'title'),
          body: f(fields, 'body'),
          group: f(fields, 'group'),
          _sort: fInt(fields, 'sort_order'),
        };
      })
      .filter((r) => r.group === 'why_us'),
  ).map(({group: _g, ...rest}) => rest);
}

// ── value_prop — TrustBar / AboutValues {icon, title, body} ──────────────────

export function mapValueProps(data: unknown, group: 'trust' | 'about_values') {
  return bySort(
    nodesOf(data)
      .map((node) => {
        const fields: MetaField[] = node.fields;
        return {
          icon: f(fields, 'icon'),
          title: f(fields, 'title'),
          body: f(fields, 'body'),
          group: f(fields, 'group'),
          _sort: fInt(fields, 'sort_order'),
        };
      })
      .filter((r) => r.group === group),
  ).map(({group: _g, ...rest}) => rest);
}

// ── comparison_row — BookingCTA {usual, ours} ────────────────────────────────

export function mapComparisonRows(data: unknown) {
  return bySort(
    nodesOf(data).map((node) => {
      const fields: MetaField[] = node.fields;
      return {
        usual: f(fields, 'usual'),
        ours: f(fields, 'ours'),
        _sort: fInt(fields, 'sort_order'),
      };
    }),
  );
}

// ── partner — Partners {name, description, badge, logo?} ─────────────────────

export function mapPartners(data: unknown) {
  return bySort(
    nodesOf(data).map((node) => {
      const fields: MetaField[] = node.fields;
      const logo = fImg(fields, 'logo');
      return {
        name: f(fields, 'name'),
        description: f(fields, 'description'),
        badge: f(fields, 'badge'),
        logo: logo?.url ?? undefined,
        _sort: fInt(fields, 'sort_order'),
      };
    }),
  );
}

// ── gallery_item — CapturedByTribe TribeItem ─────────────────────────────────

// Explicit return type: Omit<> over a discriminated union collapses it, which
// stops the result being assignable to CapturedByTribe's TribeItem.
type TribeItemOut =
  | {kind: 'photo'; src: string; alt: string; height: string}
  | {kind: 'video'; poster: string; videoSrc?: string; alt: string; height: string};

export function mapGallery(data: unknown): TribeItemOut[] {
  return nodesOf(data)
    .map((node) => {
      const fields: MetaField[] = node.fields;
      const img = fImg(fields, 'image');
      const video = fImg(fields, 'video');
      const alt = f(fields, 'alt');
      const height = f(fields, 'height') || 'h-100';
      const item: TribeItemOut =
        f(fields, 'kind') === 'video'
          ? {kind: 'video', poster: img?.url ?? '', videoSrc: video?.url, alt, height}
          : {kind: 'photo', src: img?.url ?? '', alt, height};
      return {item, _sort: fInt(fields, 'sort_order')};
    })
    .sort((a, b) => a._sort - b._sort)
    .map((r) => r.item);
}

// ── review — same shape as mapToReviews, filtered by placement ───────────────
// `placement` is a list field, so the Admin API returns it JSON-stringified.

export function mapReviews(
  data: unknown,
  placement?: 'home' | 'reviews' | 'camp' | 'included' | 'booking' | 'why_us' | 'journey',
) {
  return bySort(
    nodesOf(data)
      .map((node) => {
        const fields: MetaField[] = node.fields;
        return {
          quote: f(fields, 'quote'),
          name: f(fields, 'author_name'),
          flag: f(fields, 'flag'),
          country: f(fields, 'country'),
          date: f(fields, 'date'),
          rating: parseFloat(f(fields, 'rating') || '0'),
          placement: fList(fields, 'placement'),
          _sort: fInt(fields, 'sort_order'),
        };
      })
      .filter((r) => (placement ? r.placement.includes(placement) : true)),
  ).map(({placement: _p, ...rest}) => rest);
}

// ── journey_day — Journey component's JourneyDay shape ───────────────────────
// Filtered by the tour_route metaobject gid held in the `route` reference field.
// `review` is a metaobject_reference, resolved here into the DayReview shape.
// It stays null when the reference is unset, and `images` can come back empty
// when no files are uploaded — Journey indexes both unguarded (day.review.rating
// and images[idx].src), so the caller must check for each before using the data.

type DayReviewOut = {
  rating: number;
  quote: string;
  name: string;
  flag: string;
  country: string;
  date: string;
};

/** Builds a DayReview from a referenced `review` metaobject, if present. */
function reviewFromRef(field?: MetaField): DayReviewOut | null {
  const ref: any = field?.reference;
  const refFields: MetaField[] | undefined = ref?.fields;
  if (!refFields?.length) return null;
  const g = (k: string) => refFields.find((x) => x.key === k)?.value ?? '';
  const quote = g('quote');
  if (!quote) return null;
  return {
    rating: parseFloat(g('rating') || '0'),
    quote,
    name: g('author_name'),
    flag: g('flag'),
    country: g('country'),
    date: g('date'),
  };
}

/**
 * `routeHandle` filters to one route's days — matched on the linked
 * tour_route's handle, not its gid, so the same code works against a second
 * store where the metaobject ids are different.
 */
export function mapJourneyDays(data: unknown, routeHandle?: string) {
  return nodesOf(data)
    .map((node) => {
      const fields: MetaField[] = node.fields;
      const imageNodes: any[] =
        fields.find((x) => x.key === 'images')?.references?.nodes ?? [];
      return {
        number: fInt(fields, 'day_number'),
        title: f(fields, 'title'),
        emoji: f(fields, 'emoji'),
        emojiLabel: f(fields, 'emoji_label'),
        route: [
          {label: f(fields, 'stop_start'), active: true},
          {label: f(fields, 'stop_mid')},
          {label: f(fields, 'stop_end')},
        ],
        paragraphs: f(fields, 'paragraphs').split('\n\n').filter(Boolean),
        highlights: fList(fields, 'highlights'),
        images: imageNodes
          .filter((n) => n?.image?.url)
          .map((n) => ({src: n.image.url as string, alt: (n.image.altText as string) ?? ''})),
        review: reviewFromRef(fields.find((x) => x.key === 'review')),
        routeHandle: ((fields.find((x) => x.key === 'route')?.reference as any)
          ?.handle ?? '') as string,
        _sort: fInt(fields, 'sort_order'),
      };
    })
    .filter((d) => (routeHandle ? d.routeHandle === routeHandle : true))
    .sort((a, b) => a._sort - b._sort)
    .map(({_sort: _s, routeHandle: _r, ...rest}) => rest);
}

// ── menus — SiteNavbar/SiteFooter's {label, href} shape ──────────────────────
// Only top-level items are returned; neither component renders submenus.

// The Storefront API returns absolute URLs (https://shop.myshopify.com/faq),
// unlike the Admin API which returned relative paths. Left as-is they would send
// visitors off the Hydrogen app to the Shopify-hosted domain, so strip the origin
// back to a path. External links (a different host) are passed through untouched.
function toAppPath(url: string): string {
  try {
    const u = new URL(url);
    return `${u.pathname}${u.search}${u.hash}` || '/';
  } catch {
    return url; // already relative
  }
}

// ── booking add-ons — built from the quad / transfer products ───────────────

type AddonVariant = {
  id: string;
  title: string;
  availableForSale: boolean;
  price: number;
  image: {url: string; alt: string} | null;
};

function addonVariants(data: unknown): AddonVariant[] {
  const product = (data as any)?.product;
  if (!product) return [];
  const fallback = product.featuredImage;
  return (product.variants?.nodes ?? []).map((v: any) => {
    const img = v.image ?? fallback ?? null;
    return {
      id: v.id as string,
      title: (v.title as string) ?? '',
      availableForSale: v.availableForSale !== false,
      price: Number(v.price?.amount ?? 0),
      image: img?.url ? {url: img.url as string, alt: (img.altText as string) ?? ''} : null,
    };
  });
}

/**
 * Maps the quad-bike product's variants to the booking form's extras.
 *
 * `eyebrow` and the id stay in code: the id keys the form's own quantity state
 * and the eyebrow is a ui_string, so neither belongs to the product. Returns []
 * if anything is missing a price or an image, so the component keeps its own
 * complete defaults rather than rendering a half-filled card.
 */
export function mapBookingExtras(data: unknown, eyebrow: string) {
  const rows = addonVariants(data)
    .filter((v) => v.availableForSale && v.price > 0 && v.image)
    .map((v) => ({
      id: `quad-${v.title.toLowerCase().replace(/\s+/g, '-')}`,
      // `variantTitle` is the product's own wording ("Individual" / "Double");
      // the noun after it is a ui_string the component appends, so a Spanish
      // store reads "Quad individual" without a code change.
      variantTitle: v.title,
      label: v.title,
      eyebrow,
      price: v.price,
      priceDisplay: `+€${v.price}`,
      image: v.image!.url,
      imageAlt: v.image!.alt,
      variantId: v.id,
      max: 10,
      // Nothing is pre-added — every extra starts at zero and is the
      // shopper's own choice.
      defaultQty: 0,
    }));
  return rows.length ? rows : [];
}

/**
 * Maps the airport-transfer product to the form's transfer config. Needs both
 * a one-way and a return variant; anything else returns null so the caller
 * falls back rather than pricing a leg it couldn't read.
 */
export function mapBookingTransfer(data: unknown) {
  const variants = addonVariants(data).filter((v) => v.availableForSale);
  const oneway = variants.find((v) => /one\s*way/i.test(v.title));
  const ret = variants.find((v) => /return/i.test(v.title));
  if (!oneway || !ret || !oneway.price || !ret.price) return null;
  const image = oneway.image ?? ret.image;
  if (!image) return null;
  return {
    onewayPrice: oneway.price,
    returnPrice: ret.price,
    onewayVariantId: oneway.id,
    returnVariantId: ret.id,
    image: image.url,
    imageAlt: image.alt,
  };
}

/** Reads the shop's primary domain host out of a SF_SITE_SETTINGS_QUERY result. */
export function primaryDomainHost(data: unknown): string {
  return ((data as any)?.shop?.primaryDomain?.host as string) ?? '';
}

/**
 * @param internalHosts hosts to rewrite to app-relative paths. Must include the
 * primary domain as well as the myshopify one: Shopify resolves FRONTPAGE menu
 * items against the primary domain, so "Home" would otherwise render as an
 * absolute link that navigates out of the app entirely.
 */
export function mapMenu(
  data: unknown,
  internalHosts?: string | Array<string | undefined>,
): Array<{label: string; href: string}> {
  const hosts = (Array.isArray(internalHosts) ? internalHosts : [internalHosts])
    .filter((h): h is string => Boolean(h))
    .map((h) => h.replace(/^https?:\/\//i, '').replace(/\/$/, '').toLowerCase());

  const items: any[] = (data as any)?.menu?.items ?? [];
  return items
    .filter((i) => i?.title && i?.url)
    .map((i) => {
      const raw = i.url as string;
      let href = raw;
      if (/^https?:\/\//i.test(raw)) {
        const host = (() => {
          try {
            return new URL(raw).host.toLowerCase();
          } catch {
            return '';
          }
        })();
        // Only internalise links pointing at one of this store's own domains;
        // genuinely external links pass through untouched.
        if (!hosts.length || hosts.includes(host)) href = toAppPath(raw);
      }
      return {label: i.title as string, href};
    });
}

// ── tour product variants → cheapest price per route ─────────────────────────
// tour_route has no `price` field: pricing lives on the product variants, one
// per Route × Camp Tier. A route's displayed "from" price is its cheapest
// variant. Keys are tour_route handles, derived from the Route option value
// ("Classic Loop" → "classic-loop").

export function mapRoutePrices(data: unknown): Record<string, number> {
  const variants: any[] = (data as any)?.product?.variants?.nodes ?? [];
  const out: Record<string, number> = {};
  for (const v of variants) {
    const route = v?.selectedOptions?.find((o: any) => o.name === 'Route')?.value;
    const amount = parseFloat(v?.price?.amount ?? '');
    if (!route || !Number.isFinite(amount)) continue;
    const handle = route.toLowerCase().replace(/\s+/g, '-');
    if (out[handle] === undefined || amount < out[handle]) out[handle] = amount;
  }
  return out;
}

// ── site_settings — single entry, flat object ────────────────────────────────

export function mapSiteSettings(data: unknown) {
  const node = nodesOf(data)[0];
  if (!node) return null;
  const fields: MetaField[] = node.fields;
  return {
    brandName: f(fields, 'brand_name'),
    tagline: f(fields, 'tagline'),
    whatsappUrl: f(fields, 'whatsapp_url'),
    instagramHandle: f(fields, 'instagram_handle'),
    instagramUrl: f(fields, 'instagram_url'),
    tiktokUrl: f(fields, 'tiktok_url'),
    ratingValue: f(fields, 'rating_value'),
    ratingCountLabel: f(fields, 'rating_count_label'),
    travelersHosted: f(fields, 'travelers_hosted'),
    foundedLabel: f(fields, 'founded_label'),
    depositPercent: fInt(fields, 'deposit_percent'),
    freeCancellationHours: fInt(fields, 'free_cancellation_hours'),
    maxGroupSize: fInt(fields, 'max_group_size'),
    /** Which Shopify blog feeds the journal. Blank means "use the first one". */
    blogHandle: f(fields, 'blog_handle'),
    /** Private / Shared — sent to the booking backend as `_tour_type`. */
    tourType: f(fields, 'tour_type'),
    // Catalogue handles. Configuration, not content: these stay in English on
    // every store. They live in Admin so a second store can point at its own
    // products without a code change. Blank falls back to the defaults below.
    // Brand assets. Empty falls back to the SVG bundled with the theme, so a
    // store that has not uploaded its own still renders.
    logoUrl: fFileUrl(fields, 'logo'),
    faviconUrl: fFileUrl(fields, 'favicon'),
    tourProductHandle: f(fields, 'tour_product_handle'),
    quadProductHandle: f(fields, 'quad_product_handle'),
    transferProductHandle: f(fields, 'transfer_product_handle'),
    journeyRouteHandle: f(fields, 'journey_route_handle'),
  };
}

export {fList};
