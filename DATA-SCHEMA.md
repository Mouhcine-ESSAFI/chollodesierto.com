# Chollodesierto — Data & Commerce Schema

Reference model for every piece of content and commerce data in the storefront:
what exists today, what is still hardcoded, and the target Shopify schema needed
to drive the whole site from the Admin.

Field types use the real Shopify API names (`single_line_text_field`, not the
shorthand `single_line_text` used in the comment block at
[queries.ts:1-49](app/lib/queries.ts#L1-L49)).

---

## 1. Current state

### 1.1 Wired to Shopify

Four metaobject types are queried, and only from two routes:

| Type | Query | Consumed by | Mapper |
| --- | --- | --- | --- |
| `tour_route` | `TOUR_ROUTES_QUERY` | `_index`, `booking` | `mapToTourRoutes`, `mapToBookingRoutes` |
| `camp_tier` | `CAMP_TIERS_QUERY` | `_index`, `booking` | `mapToCampTiers`, `mapToBookingCamps` |
| `faq_item` | `FAQS_QUERY` | `_index` | `mapToFaqs` |
| `review` | `REVIEWS_QUERY` | `_index`, `booking` | `mapToReviews` |

Every query is wrapped in `.catch(() => null)` and every component falls back to
its own hardcoded constant when the result is empty — see
[_index.tsx:39-51](app/routes/_index.tsx#L39-L51). The site therefore renders
identically whether or not Shopify returns anything, which is why the missing
storefront token never surfaced as a visible content failure.

### 1.2 Not wired — hardcoded in components

| Data | Location | Records |
| --- | --- | --- |
| Journey day-by-day itinerary | [Journey.tsx:27-127](app/components/Journey.tsx#L27-L127) | 3 days × (route, paragraphs, highlights, 3 images, review) |
| Booking extras (quads) | [BookingBody.tsx:81-106](app/components/BookingBody.tsx#L81-L106) | 2 |
| Airport transfer | [BookingBody.tsx:108-114](app/components/BookingBody.tsx#L108-L114) | 1 config |
| "What's in the price" grid | [BookingBody.tsx:127-137](app/components/BookingBody.tsx#L127-L137) | 9 |
| Booking FAQs | [BookingBody.tsx:139-165](app/components/BookingBody.tsx#L139-L165) | 5 |
| Included / Bring checklists | [Included.tsx:20-76](app/components/Included.tsx#L20-L76) | 9 + 7 |
| Why-choose-us reasons | [WhyChooseUs.tsx:19-24](app/components/WhyChooseUs.tsx#L19-L24) | 4 |
| Trust features | [TrustBar.tsx:11-15](app/components/TrustBar.tsx#L11-L15) | 3 |
| Honest-comparison rows | [BookingCTA.tsx:8-15](app/components/BookingCTA.tsx#L8-L15) | 6 |
| Testimonials carousel | [Testimonials.tsx:15-22](app/components/Testimonials.tsx#L15-L22) | 6 |
| General FAQ accordion | [Faq.tsx:8-19](app/components/Faq.tsx#L8-L19) | 10 |
| Gallery / tribe media | [CapturedByTribe.tsx:20-27](app/components/CapturedByTribe.tsx#L20-L27) | 6 |
| Partners | [Partners.tsx:1-32](app/components/Partners.tsx#L1-L32) | 6 |
| About story / values / partners copy | `AboutStory.tsx`, `AboutValues.tsx`, `AboutPartners.tsx` | prose + 4 values + 3 stats + 6 images |
| Nav, legal, social links | [SiteNavbar.tsx:4-8](app/components/SiteNavbar.tsx#L4-L8), [SiteFooter.tsx:16-36](app/components/SiteFooter.tsx#L16-L36) | 3 + 6 + 3 + 3 |
| Homepage video + poster | [_index.tsx:63-64](app/routes/_index.tsx#L63-L64) | inline URLs |
| Legacy mock data | [mock-tours.ts](app/lib/mock-tours.ts) | tours, camps, reviews, faqs |

All imagery is Unsplash hotlinks, not Shopify Files.

---

## 2. Critical gaps

These are the findings that change what the schema has to cover — not cosmetic issues.

**2.1 There is no product, cart, or checkout anywhere.**
The booking flow is a price calculator only. "Reserve your spot"
([BookingBody.tsx:784-795](app/components/BookingBody.tsx#L784-L795)) is a bare
`type="button"` with no handler. `total` is computed client-side
([BookingBody.tsx:302-306](app/components/BookingBody.tsx#L302-L306)) and
discarded. `CART_QUERY_FRAGMENT` is defined and `cart` is on the load context,
but nothing ever calls `CartForm` or `cart.addLines`. Nothing can be sold today.

**2.2 Route data exists in three conflicting copies.**

| Source | IDs | Prices |
| --- | --- | --- |
| [mock-tours.ts:28-71](app/lib/mock-tours.ts#L28-L71) | `reverse-crossing`, `classic-loop`, `grand-crossing` | 155 / 85 / 115 |
| [TourRoutes.tsx:22-61](app/components/TourRoutes.tsx#L22-L61) | `reverse`, `classic`, `grand` | €155 / €85 / €115 |
| [BookingBody.tsx:42-46](app/components/BookingBody.tsx#L42-L46) | `classic`, `grand`, `reverse` | 85 / 115 / 155 |

`mapToTourRoutes` builds `href = /tours/${handle}`
([queries.ts:173](app/lib/queries.ts#L173)), but `tours.$id.tsx` resolves the id
against `mock-tours.ts` only ([tours.$id.tsx:17](app/routes/tours.$id.tsx#L17)).
**Any metaobject whose handle isn't exactly `classic-loop`, `grand-crossing` or
`reverse-crossing` renders a "Tour not found" page.** The handle is a hard
contract until that route is migrated.

**2.3 `/faq` renders the wrong component.**
[faq.tsx:20](app/routes/faq.tsx#L20) renders `<Included />`, and its meta title
is `"Included — Budget Desert Tour"` while the description talks about FAQs. The
`Faq` component is only mounted on the homepage, and `/reviews` renders
`Reviews.tsx`, which reads `mock-tours.ts` directly and ignores the `review`
metaobject entirely.

**2.4 Metaobject-backed data only reaches two routes.**
`/routes` renders `<TourRoutes />` with no props, so it always shows hardcoded
data even when Shopify is populated. Same for `/faq` and `/reviews`.

**2.5 The calendar has no availability model.**
Departure dates are anchored to a hardcoded June 2026
([BookingBody.tsx:271-281](app/components/BookingBody.tsx#L271-L281)) with no
blackout dates, capacity, or inventory. Group size is capped at 17 in the UI
only.

**2.6 Field-coverage mismatches.**
`mapToCampTiers` never reads `price_delta`, though `mapToBookingCamps` does — so
the homepage tier cards cannot compute money. `review` defines `flag`, `country`
and `rating`, but the `REVIEWS` mock has none of them, so `/reviews` renders
hardcoded 5-star ratings ([Reviews.tsx:20-28](app/components/Reviews.tsx#L20-L28)).

---

## 3. Target metaobject schema

Conventions for every type:

- `sort_order` — `number_integer`, controls display order; the mappers already sort on it.
- `image` — `file_reference` (validation: images only), replacing Unsplash hotlinks.
- Handles are stable identifiers and are used in URLs — treat as immutable once published.
- Anything with an emoji glyph also carries a text label for accessibility; the
  components already require this pair (`bestForEmoji` / `bestForEmojiLabel`).

### 3.1 `tour_route` — existing, extended

The itinerary offered. Handle **must** match the `/tours/:id` slug.

| Field | Type | Notes |
| --- | --- | --- |
| `title` | `single_line_text_field` | "The Classic Loop" |
| `label` | `single_line_text_field` | side-card eyebrow; empty on the featured card |
| `badge` | `single_line_text_field` | featured ribbon, e.g. "Most Popular" |
| `featured` | `boolean` | raises + re-styles the centre card |
| `stop_start` / `stop_mid` / `stop_end` | `single_line_text_field` | exactly three stops; the UI is hardwired to 3 |
| `description_lines` | `multi_line_text_field` | one rendered line per newline |
| `price` | `number_integer` | base € per person — see §4 on moving this to a variant |
| `days` | `number_integer` | default 3 |
| `image` | `file_reference` | card + hero |
| `sort_order` | `number_integer` | |
| **`product`** | `product_reference` | **new** — links the route to its sellable product |
| **`hero_image`** | `file_reference` | **new** — `/tours/:id` hero, currently reuses the card image |
| **`seo_description`** | `single_line_text_field` | **new** — currently derived from `description` |

### 3.2 `camp_tier` — existing, one fix

| Field | Type | Notes |
| --- | --- | --- |
| `name` | `single_line_text_field` | "Comfort Camp" |
| `badge` | `single_line_text_field` | photo overlay, "Private. Quiet. Easy." |
| `price_label` | `single_line_text_field` | "In price" / "Per person" |
| `price_value` | `single_line_text_field` | display string: "Included" / "+€15" |
| `price_delta` | `number_integer` | 0 / 15 / 45 — **must also be read by `mapToCampTiers`** (§2.6) |
| `features` | `list.single_line_text_field` | 4 bullets |
| `best_for_emoji` | `single_line_text_field` | |
| `best_for_emoji_label` | `single_line_text_field` | accessible label |
| `best_for_text` | `single_line_text_field` | |
| `featured` | `boolean` | raised centre tier |
| `image` | `file_reference` | |
| `sort_order` | `number_integer` | |
| **`variant`** | `variant_reference` | **new** — the upsell variant/line item |

### 3.3 `faq_item` — existing, needs grouping

Two distinct FAQ sets exist (general accordion vs. booking-page accordion) and
currently share one type.

| Field | Type | Notes |
| --- | --- | --- |
| `question` | `single_line_text_field` | |
| `answer` | `multi_line_text_field` | |
| **`group`** | `single_line_text_field` | **new** — `general` \| `booking`; filter in the mapper |
| `sort_order` | `number_integer` | |

### 3.4 `review` — existing

| Field | Type | Notes |
| --- | --- | --- |
| `quote` | `multi_line_text_field` | |
| `author_name` | `single_line_text_field` | |
| `flag` | `single_line_text_field` | emoji |
| `country` | `single_line_text_field` | accessible label for the flag |
| `date` | `single_line_text_field` | display string, "February 2025" |
| `rating` | `number_decimal` | 0–5, halves supported |
| `sort_order` | `number_integer` | |
| **`verified`** | `boolean` | **new** — drives the "Verified traveler" pill |
| **`placement`** | `list.single_line_text_field` | **new** — `home` \| `booking` \| `reviews` \| `camp` \| `included` |

`placement` matters because five components each render a *different* single
featured review today, all hardcoded separately.

### 3.5 `journey_day` — new

Drives [Journey.tsx](app/components/Journey.tsx), the largest hardcoded block.

| Field | Type | Notes |
| --- | --- | --- |
| `day_number` | `number_integer` | 1-based; drives the spine badge |
| `title` | `single_line_text_field` | |
| `stop_start` / `stop_mid` / `stop_end` | `single_line_text_field` | three timeline stops |
| `paragraphs` | `multi_line_text_field` | one `<p>` per blank-line-separated block |
| `highlights` | `list.single_line_text_field` | "What you'll see today" pills |
| `images` | `list.file_reference` | exactly 3 — the carousel peeks two cards behind |
| `review` | `metaobject_reference` → `review` | per-day testimonial |
| `route` | `metaobject_reference` → `tour_route` | so each route can have its own itinerary |
| `sort_order` | `number_integer` | |

Note the itinerary is currently global, but the three routes genuinely differ
(the Classic Loop returns to Marrakech; the Grand Crossing ends in Fes). Scoping
`journey_day` by `route` is what makes per-route itineraries possible.

### 3.6 `extra_option` — new

Optional paid add-ons ([BookingBody.tsx:81-106](app/components/BookingBody.tsx#L81-L106)).

| Field | Type | Notes |
| --- | --- | --- |
| `label` | `single_line_text_field` | "Double Quad" |
| `eyebrow` | `single_line_text_field` | "Per quad" |
| `price` | `number_integer` | numeric, used in the total |
| `price_display` | `single_line_text_field` | "+€65" |
| `image` | `file_reference` | |
| `max_qty` | `number_integer` | default 10 |
| `default_qty` | `number_integer` | pre-selected quantity |
| `variant` | `variant_reference` | the cart line |
| `sort_order` | `number_integer` | |

### 3.7 `transfer_option` — new

Currently a single hardcoded config object with two prices.

| Field | Type | Notes |
| --- | --- | --- |
| `name` | `single_line_text_field` | "Airport transfer" |
| `oneway_price` | `number_integer` | |
| `return_price` | `number_integer` | |
| `oneway_variant` / `return_variant` | `variant_reference` | |
| `image` | `file_reference` | |
| `vehicle_capacity` | `number_integer` | the UI hardcodes "1 Vehicle" |

### 3.8 `checklist_item` — new

Covers both the Included and Bring-yourself columns, and the "What's in the
price" grid, which are three near-identical structures today.

| Field | Type | Notes |
| --- | --- | --- |
| `icon` | `single_line_text_field` | emoji |
| `icon_label` | `single_line_text_field` | accessible label |
| `text` | `single_line_text_field` | |
| `subtitle` | `single_line_text_field` | only used by the booking grid |
| `group` | `single_line_text_field` | `included` \| `bring` \| `price_grid` |
| `sort_order` | `number_integer` | |

### 3.9 `value_prop` — new

One type for the Why-Choose-Us cards, the TrustBar features and the About values —
all three are `{icon, title, body}`.

| Field | Type | Notes |
| --- | --- | --- |
| `icon` | `single_line_text_field` | emoji, or a keyword for the inline SVG set (`check`/`star`/`heart`/`minibus`/`landscape`/`card`) |
| `icon_label` | `single_line_text_field` | |
| `title` | `single_line_text_field` | |
| `body` | `multi_line_text_field` | |
| `group` | `single_line_text_field` | `why_us` \| `trust` \| `about_values` |
| `sort_order` | `number_integer` | |

### 3.10 `comparison_row` — new

| Field | Type |
| --- | --- |
| `usual` | `single_line_text_field` |
| `ours` | `single_line_text_field` |
| `sort_order` | `number_integer` |

### 3.11 `partner` — new

| Field | Type | Notes |
| --- | --- | --- |
| `name` | `single_line_text_field` | |
| `description` | `multi_line_text_field` | |
| `badge` | `single_line_text_field` | category chip |
| `logo` | `file_reference` | optional; falls back to the initial letter |
| `image` | `file_reference` | carousel photo on the About page |
| `sort_order` | `number_integer` | |

### 3.12 `gallery_item` — new

| Field | Type | Notes |
| --- | --- | --- |
| `kind` | `single_line_text_field` | `photo` \| `video` |
| `image` | `file_reference` | photo, or video poster |
| `video` | `file_reference` | validation: video; optional |
| `alt` | `single_line_text_field` | |
| `height` | `single_line_text_field` | `h-100` \| `h-125` — the marquee alternates heights |
| `sort_order` | `number_integer` | |

### 3.13 `site_settings` — new, single entry

Everything currently living as component default props and literal strings.

| Field | Type | Notes |
| --- | --- | --- |
| `brand_name` | `single_line_text_field` | "Budget Desert Tour" |
| `tagline` | `multi_line_text_field` | "Real Sahara. / Fair price. / …" |
| `whatsapp_url` | `url` | referenced by `Faq`, `BookingBody`, `SiteFooter` — three separate `#whatsapp` placeholders today |
| `instagram_handle` | `single_line_text_field` | drives the "Tag @…" line |
| `instagram_url` / `tiktok_url` | `url` | |
| `rating_value` | `number_decimal` | the "4.9" repeated in Hero, AboutHero, AboutValues |
| `rating_count_label` | `single_line_text_field` | "Trusted by 3k+ people." |
| `travelers_hosted` | `single_line_text_field` | "9,000+" |
| `founded_label` | `single_line_text_field` | "Since 2015" — note About copy says 2015 in the stat and 2017 in the story |
| `deposit_percent` | `number_integer` | 20 — currently hardcoded in five copy strings |
| `free_cancellation_hours` | `number_integer` | **48 in some copy, 7 days in others — see §6** |
| `max_group_size` | `number_integer` | 17 |
| `hero_video` / `hero_poster` | `file_reference` | |

### 3.14 `nav_link` — new

| Field | Type | Notes |
| --- | --- | --- |
| `label` | `single_line_text_field` | |
| `url` | `url` | |
| `group` | `single_line_text_field` | `header` \| `footer` \| `legal` |
| `sort_order` | `number_integer` | |

Alternatively use native Shopify menus — `HEADER_QUERY` / `FOOTER_QUERY` already
exist in [fragments.ts:191-233](app/lib/fragments.ts#L191-L233) and are unused.
Prefer those over a custom metaobject; the fragments are already written.

---

## 4. Commerce model

This is the part with no implementation at all today, so it is a design
proposal rather than documentation of existing behaviour.

The pricing formula in [BookingBody.tsx:302-306](app/components/BookingBody.tsx#L302-L306) is:

```
total = route.price × travelers
      + camp.delta × travelers
      + Σ(extra.qty × extra.price)
      + (transfer ? transferPrice : 0)
```

### 4.1 Recommended mapping

| Concept | Shopify object | Quantity means |
| --- | --- | --- |
| Tour route | Product, one per route | — |
| Camp tier | Variant of the tour product (option "Camp") | number of travelers |
| Extras | Separate product per extra | number of units |
| Transfer | Product with `One way` / `Return` variants | 1 |

Variant price = `route.price + camp.delta`, so the €85 Classic Loop yields three
variants at €85 / €100 / €130. This keeps all money in Shopify — required for
correct tax, currency and discount behaviour — and makes the metaobject `price`
/ `price_delta` fields display-only mirrors.

Trade-off: 3 routes × 3 tiers = 9 variants, and every price change must be made
in two places unless the metaobject fields are dropped in favour of reading
`variant.price` directly. Reading from the variant is cleaner; the integer
fields exist only because there was no product model.

### 4.2 Line item attributes

Booking specifics that are not variants belong on cart line attributes:

| Attribute | Source |
| --- | --- |
| `_departure_date` | calendar selection |
| `_return_date` | departure + 7 |
| `_route_handle` | selected route |
| `_camp_handle` | selected tier |
| `_travelers` | traveller count |
| `_transfer_type` | `oneway` \| `return` |
| `_pickup_location` | **not collected today — needs a form field** |
| `_contact_whatsapp` | **not collected today** |

The booking form gathers no customer contact details, pickup address, or
traveller names. Those inputs must be added before checkout is meaningful.

### 4.3 Deposit

Copy promises "Book your spot with 20%, pay the rest on the day". Options:

1. **Selling plan / deferred purchase option** — native Shopify partial payments. Correct, but requires the deposit selling-plan group to be configured and attached, and adds `sellingPlanId` to every cart line.
2. **Deposit as its own product** priced at 20% of the total — simple, but decouples the deposit from the booking and makes refunds manual.
3. **Draft orders via the Admin API** — full control, but moves checkout off the Storefront API and needs a server-side token.

Option 1 is the correct one if partial payments are available on the plan.
This decision affects the schema (`selling_plan` reference on `tour_route`), so
it should be settled before the metaobjects are created.

### 4.4 Availability

Nothing models departure availability. Minimum needed:

- `departure` metaobject — `date`, `route` reference, `capacity`, `seats_taken`, `status`; or
- Shopify inventory per variant per date, which variants alone cannot express.

Without one of these the calendar will happily accept a sold-out or non-running
date. This is the largest open design question and is not resolvable from the
codebase — it depends on how departures are actually scheduled operationally.

---

## 5. Metafields

Metaobjects cover repeated records; metafields cover one-off page content.

**Page metafields** (namespace `custom`) — `BookingHero` already anticipates
this ([BookingHero.tsx:1-2](app/components/BookingHero.tsx#L1-L2)):

| Key | Type | Used by |
| --- | --- | --- |
| `hero_headline` | `single_line_text_field` | `BookingHero`, `AboutHero` |
| `hero_subtext` | `multi_line_text_field` | |
| `hero_image` | `file_reference` | |
| `section_heading` / `section_subheading` | `single_line_text_field` | every section eyebrow/heading currently passed as a default prop |

**Product metafields** for tour products:

| Key | Type |
| --- | --- |
| `duration_days` | `number_integer` |
| `group_size_max` | `number_integer` |
| `route` | `metaobject_reference` → `tour_route` |
| `journey_days` | `list.metaobject_reference` → `journey_day` |

---

## 6. Content inconsistencies to resolve before migrating

Migrating hardcoded copy into Shopify will surface these, so decide first:

- **Cancellation window contradicts itself.** "Free cancellation up to 48 hours" in [mock-tours.ts:179](app/lib/mock-tours.ts#L179), [TrustBar.tsx:12](app/components/TrustBar.tsx#L12) and [BookingBody.tsx:799-800](app/components/BookingBody.tsx#L799-L800), versus "up to 7 days" in [booking.tsx:19](app/routes/booking.tsx#L19), [BookingBody.tsx:141-143](app/components/BookingBody.tsx#L141-L143) and [Faq.tsx:17](app/components/Faq.tsx#L17).
- **Founding year** — "Since 2015" in [AboutValues.tsx:48](app/components/AboutValues.tsx#L48) vs. "in 2017, I started Budget Desert Tour" in [AboutStory.tsx:30](app/components/AboutStory.tsx#L30).
- **Group size** — "Max 16" in [BookingCTA.tsx:9](app/components/BookingCTA.tsx#L9) and [WhyChooseUs.tsx:20](app/components/WhyChooseUs.tsx#L20) vs. "Up to 17" in [BookingBody.tsx:514](app/components/BookingBody.tsx#L514).
- **Brand name** — the UI says "Budget Desert Tour" throughout; the About page meta says "Chollodesierto" ([about.tsx:10](app/routes/about.tsx#L10)); the store domain is `chollodesierto.myshopify.com`.
- **Review counts** — "3,000+ stories" and "Trusted by 3k+" vs. "9,000+ travelers hosted".
- **Duplicate camp imagery** — `CampTiers` and `BookingBody` use different photos for the same three tiers.

---

## 7. Suggested migration order

1. Fix `/faq` rendering `Included`, and feed `/routes` + `/reviews` from loaders (§2.3, §2.4) — pure bugs, no schema needed.
2. Collapse the three route definitions into one source and lock the handles (§2.2).
3. Add `price_delta` to `mapToCampTiers` (§2.6).
4. Create the metaobjects in §3 and populate; upload imagery to Shopify Files.
5. Extend loaders to the remaining routes; delete `mock-tours.ts` and the component fallbacks once each is Shopify-backed.
6. Decide the deposit and availability models (§4.3, §4.4) — these gate any real checkout.
7. Build products/variants, wire `CartForm` to the Reserve button, add the missing contact/pickup fields.

Steps 1–3 are independent of Shopify and can be done immediately; step 6 needs a
business decision before any code.
