// ── GraphQL Queries ─────────────────────────────────────────────────────────
//
// Shopify Metaobject setup (do once in Admin → Settings → Custom data → Metaobjects):
//
// ┌─ tour_route ─────────────────────────────────────────────────────────────┐
// │  title           single_line_text                                        │
// │  label           single_line_text   (side-card eyebrow)                  │
// │  badge           single_line_text   (featured ribbon, e.g. "Most Popular")│
// │  featured        boolean                                                  │
// │  stop_start      single_line_text   (e.g. "Marrakech")                   │
// │  stop_mid        single_line_text   (e.g. "Merzouga")                    │
// │  stop_end        single_line_text   (e.g. "Fez")                         │
// │  description_lines  multi_line_text (one line per newline)               │
// │  price           number_integer     (in €, e.g. 85)                      │
// │  days            number_integer     (default 3)                           │
// │  image           file_reference                                           │
// │  sort_order      number_integer     (controls display order)              │
// └──────────────────────────────────────────────────────────────────────────┘
//
// ┌─ camp_tier ───────────────────────────────────────────────────────────────┐
// │  name            single_line_text                                         │
// │  badge           single_line_text   (overlay text, e.g. "Traditional…")  │
// │  price_label     single_line_text   ("In price" / "Per person")           │
// │  price_value     single_line_text   ("Included" / "+€15" / "+€45")        │
// │  price_delta     number_integer     (0 / 15 / 45)                         │
// │  features        list.single_line_text                                    │
// │  best_for_emoji  single_line_text   (e.g. "🎒")                           │
// │  best_for_emoji_label  single_line_text  (accessible label)               │
// │  best_for_text   single_line_text                                         │
// │  featured        boolean            (raised center tier)                  │
// │  image           file_reference                                            │
// │  sort_order      number_integer                                            │
// └───────────────────────────────────────────────────────────────────────────┘
//
// ┌─ faq_item ────────────────────────────────────────────────────────────────┐
// │  question        single_line_text                                         │
// │  answer          multi_line_text                                          │
// │  sort_order      number_integer                                            │
// └───────────────────────────────────────────────────────────────────────────┘
//
// ┌─ review ──────────────────────────────────────────────────────────────────┐
// │  quote           multi_line_text                                          │
// │  author_name     single_line_text                                         │
// │  flag            single_line_text   (emoji, e.g. "🇩🇪")                   │
// │  country         single_line_text   (e.g. "Germany")                      │
// │  date            single_line_text   (e.g. "February 2025")                │
// │  rating          number_decimal     (0–5, halves OK)                      │
// │  sort_order      number_integer                                            │
// └───────────────────────────────────────────────────────────────────────────┘

export const TOUR_ROUTES_QUERY = `#graphql
  query TourRoutes {
    metaobjects(type: "tour_route", first: 10) {
      nodes {
        id
        handle
        fields {
          key
          value
          reference {
            ... on MediaImage {
              image {
                url(transform: { maxWidth: 900, preferredContentType: WEBP })
                altText
              }
            }
          }
        }
      }
    }
  }
` as const;

export const CAMP_TIERS_QUERY = `#graphql
  query CampTiers {
    metaobjects(type: "camp_tier", first: 10) {
      nodes {
        id
        handle
        fields {
          key
          value
          reference {
            ... on MediaImage {
              image {
                url(transform: { maxWidth: 900, preferredContentType: WEBP })
                altText
              }
            }
          }
        }
      }
    }
  }
` as const;

export const FAQS_QUERY = `#graphql
  query Faqs {
    metaobjects(type: "faq_item", first: 20) {
      nodes {
        id
        fields { key value }
      }
    }
  }
` as const;

export const REVIEWS_QUERY = `#graphql
  query Reviews {
    metaobjects(type: "review", first: 20) {
      nodes {
        id
        fields { key value }
      }
    }
  }
` as const;

// ── Blog ─────────────────────────────────────────────────────────────────────
// Native Shopify blog + articles, authored in Admin > Content > Blog posts.

/**
 * Last-resort blog handle, used only if the store has no blog the storefront
 * can list. The real handle comes from `site_settings.blog_handle`, falling back
 * to the first blog — hardcoding it here meant the journal silently showed its
 * empty state in a store whose blog was named anything else.
 */
export const BLOG_HANDLE_FALLBACK = 'news';

/** Lists the blogs the storefront can see, so the journal can find its own. */
export const BLOGS_QUERY = `#graphql
  query Blogs {
    blogs(first: 20) {
      nodes {
        handle
        articles(first: 1) { nodes { id } }
      }
    }
  }
` as const;

/**
 * Picks which blog feeds the journal: the one named in site_settings if it
 * exists, else the first blog that actually has posts, else the first blog.
 */
export function resolveBlogHandle(
  blogsData: unknown,
  configured?: string,
): string {
  const nodes: any[] = (blogsData as any)?.blogs?.nodes ?? [];
  const handles: string[] = nodes.map((b) => b.handle as string).filter(Boolean);
  if (configured && handles.includes(configured)) return configured;
  const withPosts = nodes.find((b) => (b.articles?.nodes?.length ?? 0) > 0);
  return (withPosts?.handle as string) ?? handles[0] ?? BLOG_HANDLE_FALLBACK;
}

export const BLOG_ARTICLES_QUERY = `#graphql
  query BlogArticles($blogHandle: String!, $first: Int!) {
    blog(handle: $blogHandle) {
      title
      handle
      articles(first: $first, sortKey: PUBLISHED_AT, reverse: true) {
        nodes {
          id
          handle
          title
          excerpt
          publishedAt
          # Tags become the category filter on the listing.
          tags
          # Plain text, only so the reading time can be counted. Shopify has no
          # word-count field; this is the cheapest thing that yields one.
          content
          image { url altText }
          authorV2 { name }
        }
      }
    }
  }
` as const;

/** Average adult reading speed; the figure shown is deliberately rounded up. */
const WORDS_PER_MINUTE = 200;

export function readingMinutes(content?: string | null): number {
  if (!content) return 1;
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

/**
 * Same, for the single-article query — which returns `contentHtml` rather than
 * plain text, so the markup has to come out before words can be counted.
 */
export function readingMinutesFromHtml(html?: string | null): number {
  if (!html) return 1;
  const text = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ');
  return readingMinutes(text);
}

export const BLOG_ARTICLE_QUERY = `#graphql
  query BlogArticle($blogHandle: String!, $articleHandle: String!) {
    blog(handle: $blogHandle) {
      handle
      articleByHandle(handle: $articleHandle) {
        id
        handle
        title
        contentHtml
        excerpt
        publishedAt
        image { url altText }
        authorV2 { name }
        seo { title description }
      }
    }
  }
` as const;

/**
 * Splits a published date into its parts, in UTC.
 *
 * Deliberately not `Intl.DateTimeFormat`: that would hardcode a language, so a
 * Spanish store still printed "11 September 2026". The month name and the
 * arrangement are ui_strings instead — see `useArticleDate` — which keeps the
 * output identical on server and client, so there's no hydration mismatch.
 */
export function articleDateParts(
  publishedAt?: string | null,
): {day: number; monthIndex: number; year: number} | null {
  if (!publishedAt) return null;
  const d = new Date(publishedAt);
  if (Number.isNaN(d.getTime())) return null;
  return {day: d.getUTCDate(), monthIndex: d.getUTCMonth(), year: d.getUTCFullYear()};
}

export function mapBlogArticles(data: unknown) {
  const nodes: any[] = (data as any)?.blog?.articles?.nodes ?? [];
  return nodes.map((a) => ({
    id: a.id as string,
    handle: a.handle as string,
    title: a.title as string,
    excerpt: (a.excerpt as string) ?? '',
    // The parts, not a formatted string — the page assembles them from
    // ui_strings so the month name follows the store's language.
    dateParts: articleDateParts(a.publishedAt),
    author: (a.authorV2?.name as string) ?? '',
    image: (a.image?.url as string) ?? '',
    imageAlt: (a.image?.altText as string) ?? '',
    /** Article tags, used as the category filter. First tag wins as the label. */
    tags: ((a.tags as string[]) ?? []).filter(Boolean),
    minutes: readingMinutes(a.content as string),
  }));
}

// ── Field helpers ────────────────────────────────────────────────────────────

type MetaField = {key: string; value: string | null; reference?: any};

function f(fields: MetaField[], key: string): string {
  return fields.find((x) => x.key === key)?.value ?? '';
}
function fInt(fields: MetaField[], key: string): number {
  return parseInt(f(fields, key) || '0', 10);
}
function fFloat(fields: MetaField[], key: string): number {
  return parseFloat(f(fields, key) || '0');
}
function fBool(fields: MetaField[], key: string): boolean {
  return f(fields, key) === 'true';
}
function fImg(fields: MetaField[], key: string) {
  const img = fields.find((x) => x.key === key)?.reference?.image;
  return img ? {url: img.url as string, altText: (img.altText as string) ?? ''} : null;
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

// ── Mappers — TourRoutes component ──────────────────────────────────────────

/**
 * @param priceByHandle cheapest variant price per tour_route handle. The
 * metaobject has no `price` field — pricing lives on the product variants — so
 * without this the mapper can only fall back to 0.
 */
export function mapToTourRoutes(
  data: unknown,
  priceByHandle?: Record<string, number>,
) {
  const nodes: any[] = (data as any)?.metaobjects?.nodes ?? [];
  return nodes
    .map((node) => {
      const fields: MetaField[] = node.fields;
      const img = fImg(fields, 'image');
      const price = priceByHandle?.[node.handle as string] ?? fInt(fields, 'price');
      return {
        id: node.handle as string,
        label: f(fields, 'label'),
        featured: fBool(fields, 'featured'),
        badge: f(fields, 'badge') || undefined,
        image: img?.url ?? '',
        imageAlt: img?.altText ?? '',
        // The unit is a ui_string applied in the component, so a Spanish
        // store reads "3 Días" without touching this mapper.
        days: fInt(fields, 'days') || 3,
        title: f(fields, 'title'),
        stops: [
          {label: f(fields, 'stop_start')},
          {label: f(fields, 'stop_mid')},
          {label: f(fields, 'stop_end')},
        ] as [{label: string}, {label: string}, {label: string}],
        description: f(fields, 'description_lines').split('\n').filter(Boolean),
        // NOTE: the € symbol is hardcoded here (and across the UI) while the
        // store's currency is USD — see the open currency mismatch.
        price: `€${price}`,
        href: `/booking?route=${node.handle as string}`,
        _sort: fInt(fields, 'sort_order'),
      };
    })
    .sort((a, b) => a._sort - b._sort)
    .map(({_sort: _s, ...rest}) => rest);
}

// ── Mappers — BookingBody routes (RouteOption) ───────────────────────────────

/** @param priceByHandle see mapToTourRoutes — same reason. */
export function mapToBookingRoutes(
  data: unknown,
  priceByHandle?: Record<string, number>,
) {
  const nodes: any[] = (data as any)?.metaobjects?.nodes ?? [];
  return nodes
    .map((node) => {
      const fields: MetaField[] = node.fields;
      return {
        id: node.handle as string,
        stops: [
          f(fields, 'stop_start'),
          f(fields, 'stop_mid'),
          f(fields, 'stop_end'),
        ] as [string, string, string],
        price: priceByHandle?.[node.handle as string] ?? fInt(fields, 'price'),
        _sort: fInt(fields, 'sort_order'),
      };
    })
    .sort((a, b) => a._sort - b._sort)
    .map(({_sort: _s, ...rest}) => rest);
}

// ── Mappers — CampTiers component ────────────────────────────────────────────

export function mapToCampTiers(data: unknown) {
  const nodes: any[] = (data as any)?.metaobjects?.nodes ?? [];
  return nodes
    .map((node) => {
      const fields: MetaField[] = node.fields;
      const img = fImg(fields, 'image');
      return {
        name: f(fields, 'name'),
        image: img?.url ?? '',
        imageAlt: img?.altText ?? '',
        badge: f(fields, 'badge'),
        priceLabel: f(fields, 'price_label'),
        priceValue: f(fields, 'price_value'),
        // The tier's € surcharge over the base route price (0 / 15 / 45), so the
        // homepage cards can compute money — previously only mapToBookingCamps read it.
        delta: fInt(fields, 'price_delta'),
        features: fList(fields, 'features'),
        bestForEmoji: f(fields, 'best_for_emoji'),
        bestForEmojiLabel: f(fields, 'best_for_emoji_label'),
        bestForText: f(fields, 'best_for_text'),
        featured: fBool(fields, 'featured'),
        _sort: fInt(fields, 'sort_order'),
      };
    })
    .sort((a, b) => a._sort - b._sort)
    .map(({_sort: _s, ...rest}) => rest);
}

// ── Mappers — BookingBody camps (CampOption) ─────────────────────────────────

export function mapToBookingCamps(data: unknown) {
  const nodes: any[] = (data as any)?.metaobjects?.nodes ?? [];
  return nodes
    .map((node) => {
      const fields: MetaField[] = node.fields;
      const img = fImg(fields, 'image');
      return {
        id: node.handle as string,
        name: f(fields, 'name'),
        priceLabel: f(fields, 'price_label'),
        priceValue: f(fields, 'price_value'),
        delta: fInt(fields, 'price_delta'),
        image: img?.url ?? '',
        imageAlt: img?.altText ?? '',
        _sort: fInt(fields, 'sort_order'),
      };
    })
    .sort((a, b) => a._sort - b._sort)
    .map(({_sort: _s, ...rest}) => rest);
}

// ── Mappers — Faq component ───────────────────────────────────────────────────

export function mapToFaqs(data: unknown) {
  const nodes: any[] = (data as any)?.metaobjects?.nodes ?? [];
  return nodes
    .map((node) => {
      const fields: MetaField[] = node.fields;
      return {
        q: f(fields, 'question'),
        a: f(fields, 'answer'),
        _sort: fInt(fields, 'sort_order'),
      };
    })
    .sort((a, b) => a._sort - b._sort)
    .map(({_sort: _s, ...rest}) => rest);
}

// ── Mappers — Testimonials component ─────────────────────────────────────────

export function mapToReviews(data: unknown) {
  const nodes: any[] = (data as any)?.metaobjects?.nodes ?? [];
  return nodes
    .map((node) => {
      const fields: MetaField[] = node.fields;
      return {
        quote: f(fields, 'quote'),
        name: f(fields, 'author_name'),
        flag: f(fields, 'flag'),
        country: f(fields, 'country'),
        date: f(fields, 'date'),
        rating: fFloat(fields, 'rating'),
        _sort: fInt(fields, 'sort_order'),
      };
    })
    .sort((a, b) => a._sort - b._sort)
    .map(({_sort: _s, ...rest}) => rest);
}
