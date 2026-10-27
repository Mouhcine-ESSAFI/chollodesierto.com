# Chollodesierto — metaobject migration status

Context handoff. Shopify Hydrogen (React Router) storefront for a 3-day Sahara
desert tour. All hardcoded component content has been extracted into
`data/metaobject-entries.json` and staged for one bulk write. **Nothing has been
written to Shopify yet.**

---

## 1. Code work completed

**Cart handler + checkout action.** `createCartHandler` added to the load
context (reusing the existing `CART_QUERY_FRAGMENT`), and an `action` added to
the booking route that validates `intent`, parses `lines`, checks every gid and
quantity, calls `cart.create()`, and redirects to `cart.checkoutUrl` forwarding
`result.headers`. No cart page or drawer — home → booking → checkout.

Verified in a browser: correct variant gids and quantities reach the Storefront
API, selection changes flow through to the payload, and the error path renders
under the button. **The success redirect is unverified** because the storefront
token is wrong (see blockers).

**Route/camp id unification.** Fallback data and live metaobject data now share
one id scheme so the variant lookup survives the switch to Shopify content:

- Route ids/handles: `classic-loop`, `grand-crossing`, `reverse-crossing`
- Camp ids/handles: `shared`, `comfort`, `superior`

All 9 route×camp combinations resolve against `DEFAULT_TOUR_VARIANT_IDS` with no
orphaned keys.

### Live Shopify ids

Products (all created as DRAFT):

| Product | gid |
|---|---|
| 3-Day Sahara Tour | `gid://shopify/Product/8293947146303` |
| Quad Bike Rental | `gid://shopify/Product/8293947179071` |
| Airport Transfer | `gid://shopify/Product/8293947244607` |

Tour variants, keyed `${routeId}-${campId}`:

| Key | Variant gid | Price |
|---|---|---|
| classic-loop-shared | 43683718496319 | $85 |
| classic-loop-comfort | 43683718529087 | $100 |
| classic-loop-superior | 43683718561855 | $130 |
| grand-crossing-shared | 43683718594623 | $115 |
| grand-crossing-comfort | 43683718627391 | $130 |
| grand-crossing-superior | 43683718660159 | $160 |
| reverse-crossing-shared | 43683718692927 | $155 |
| reverse-crossing-comfort | 43683718725695 | $170 |
| reverse-crossing-superior | 43683718758463 | $200 |

Extras: quad individual `43683718823999` ($45), quad double `43683718856767`
($65), transfer one-way `43683718955071` ($20), transfer return
`43683718987839` ($35).

> **Known pricing issue, not yet fixed:** the Airport Transfer variants were
> created at placeholder prices ($20/$35) but the booking UI has always shown
> €25/€45. Needs a manual price update in Shopify Admin.

---

## 2. Staged content — 84 entries across 10 types

| Type | Count | Status |
|---|---|---|
| `tour_route` | 3 | ready |
| `camp_tier` | 3 | ready |
| `faq_item` | 15 (10 general + 5 booking) | ready |
| `review` | 8 | ready |
| `checklist_item` | 25 (9 included + 7 bring + 9 price_grid) | ready |
| `value_prop` | 11 (4 why_us + 3 trust + 4 about_values) | ready |
| `comparison_row` | 6 | ready |
| `partner` | 6 | images unresolved |
| `gallery_item` | 6 (4 photo + 2 video) | no video files |
| `site_settings` | 1 (15 fields) | 3 fields unfilled |

### tour_route

Handles are locked — `/tours/:id` resolves against them. All three link to
product `8293947146303`; price comes from the variant, not the metaobject.

| Handle | Title | Label / badge | Stops | Description lines | Featured |
|---|---|---|---|---|---|
| reverse-crossing | The Reverse Crossing | label: Coming From the North? | Fez → Merzouga → Marrakech | "Start in the imperial city," / "end in the red one." | no |
| classic-loop | The Classic Loop | badge: Most Popular | Marrakech → Merzouga → Marrakech | "The complete circle." / "Perfect if Marrakech is your home base." | yes |
| grand-crossing | The Grand Crossing | label: Best for Travelers Heading North | Marrakech → Merzouga → Fez | "One way." / "Two imperial cities." / "An endless desert in between." | no |

All three: `days: 3`. Sort order follows homepage display order (reverse 1,
classic 2 centre, grand 3).

### camp_tier

| Handle | Name | Badge | Price | Delta | Best for | Featured |
|---|---|---|---|---|---|---|
| shared | Shared Camp | Traditional. Social. Real. | Included | 0 | 🎒 Solo travelers, backpackers, anyone who came for the vibes. | no |
| comfort | Comfort Camp | Private. Quiet. Easy. | +€15 | 15 | 👨‍👩‍👧 Couples, families, light upgraders. | yes |
| superior | Superior Camp | Luxury, in the middle of nowhere. | +€45 | 45 | 🛀 Honeymoons, milestone trips, treat-yourself trips. | no |

Features (4 each):
- **shared** — Berber tent (shared with up to 4 travelers) · Real beds, warm blankets · Shared bathrooms · Communal dinner around the fire
- **comfort** — Private tent for your group · Larger beds, better insulation · Private bathroom inside the tent · Same fire. Same dinner. Same stars.
- **superior** — Luxury private suite tent · Premium bedding, real heating · Private bathroom with hot shower · Welcome drink, premium dinner

### faq_item — group `general` (10, from Faq.tsx)

1. **Wait… is it really cold at night?** — Yes — even in summer. Desert nights drop fast after sunset. Bring layers. We're not kidding.
2. **What if I've never ridden a camel?** — Neither had most of our travelers. The camels are calm, the pace is slow, and our guides walk beside you the whole way.
3. **Can I do this with kids?** — Absolutely. Families join every week. The minibus, camp beds, and meals all work for children, and the camel trek is short and gentle.
4. **Are there bathrooms at the camp?** — Yes. Shared bathrooms come standard; Comfort and Superior camps include a private bathroom inside your tent.
5. **Will there be Wi-Fi? Be honest.** — Barely, and that's kind of the point. There's patchy signal at camp — enough for a quick message, not for doom-scrolling.
6. **I'm a solo traveler. Will I feel out of place?** — Not at all. Roughly a third of our travelers come solo. Shared dinners around the fire make it easy to meet people.
7. **What if it rains?** — Rain in the Sahara is rare, but the itinerary flexes if weather turns. Your guide adjusts stops so you never miss the highlights.
8. **How far in advance should I book?** — Two to four weeks is comfortable in peak season (Sep–Nov, Mar–May). Off-season, a few days is often enough.
9. **What's your cancellation policy?** — Free cancellation up to 7 days before departure for a full refund. Inside 7 days we'll rebook you or refund 50%.
10. **Can you pick me up from my riad or the airport?** — Yes. Riad pickup in Marrakech is included. Airport pickup can be arranged — just tell us your flight details.

### faq_item — group `booking` (5, from BookingBody.tsx)

1. **What if I need to cancel?** — Free cancellation up to 7 days before departure. After that, 50% refund. Within 48h, non-refundable. We get it though — email or WhatsApp us, we're human.
2. **When am I charged?** — You pay 20% now to book your spot. The rest is due 48 hours before departure — by card, bank transfer or cash on arrival.
3. **What about pickup?** — We pick you up directly from your Riad or Hotel in Marrakech (or Fez, depending on your route) at the time confirmed the day before departure.
4. **Can I change my date after booking?** — Yes — free of charge up to 7 days before departure, subject to availability. Just message us on WhatsApp.
5. **What if my group changes?** — No problem. Let us know the new number of travelers as early as possible and we'll adjust your quote and camp arrangements.

> A **third, unused FAQ set** exists in `mock-tours.ts` (7 items) giving
> different answers to six of the same questions, including 48h vs 7 days for
> cancellation. It is dead code — excluded.

### review (8)

Three reviews appeared in both `Testimonials.tsx` and `mock-tours.ts` and were
**merged, not duplicated** — the Testimonials version won because only it
carries flag/country/rating. No rating was invented. `verified` is `false`
throughout (no source has a verification indicator).

| Author | Country | Date | Rating | Placement | Quote |
|---|---|---|---|---|---|
| Marcus K | 🇩🇪 Germany | Feb 2025 | 4.5 | home, reviews | Our guide Youssef grew up in the desert. His stories made the whole trip. You can't fake that. |
| Emma | 🇬🇧 UK | Jan 2025 | 4.5 | home, reviews | Skeptical at first, how can it be this cheap? Turns out they just don't overcharge. Simple as that. |
| Johan R | 🇳🇱 Netherlands | Oct 2024 | 4.5 | home, reviews | The sunrise over Erg Chebbi changed something in me. I'm not exaggerating. Book this trip. |
| Sofia | 🇮🇹 Italy | Mar 2025 | 5 | home | Small group, real food, zero tourist traps. Exactly what the reviews promised. |
| Daniel | 🇺🇸 US | Nov 2024 | 4.5 | home | The camp at night with the fire and music — I still think about it every week. |
| Amelie | 🇫🇷 France | Feb 2025 | 5 | home | Booked last-minute and had zero regrets. The minibus was comfortable and the driver hilarious. |
| Maria & Tom | 🇪🇸 Spain | Feb 2025 | 4.5 | camp | Upgraded to Superior for our anniversary. Worth every euro. The hot shower in the desert felt illegal. |
| Aiko | 🇯🇵 Japan | Dec 2024 | 4.5 | included | The 'bring warm layers' warning saved me. December desert is no joke. |

**Not staged:** Lukas (🇩🇪 Germany, 4.5, March 2026) in `WhyChooseUs.tsx` — no
matching `placement` value exists for it. And three day-reviews in `Journey.tsx`
that have quotes and ratings but no author or date; they belong to
`journey_day`, a later task.

**Bug:** `/reviews` renders a hardcoded 5 stars for three reviews whose real
rating is 4.5.

### checklist_item (25)

**group `included`** (9) — 🚐 AC minibus + English-speaking driver · 🐫 Camel trek into Erg Chebbi at sunset · 🏕️ Camp accommodation (your chosen tier) · 🍲 All meals (2 breakfasts, 2 dinners, water at meals) · 🎶 Live Berber music night around the fire · 🌅 Sunrise dune climb on Day 3 · 🏛️ Stops at Ait Ben Haddou, Ouarzazate, Todra Gorge, Dades Valley · 📷 All the photos you can take · ✨ Stories that will outlast the trip

**group `bring`** (7) — 🧥 Warm layers (desert nights are cold, year-round) · 🕶️ Sunglasses, sunscreen, hat · 🔋 Power bank (limited electricity at camp) · 💧 Reusable water bottle · 💶 Cash for drinks, tips, extras · 📸 Camera (your phone works fine) · ❤️ An open mind

**group `price_grid`** (9, text + subtitle) — 🚐 Transport / AC minibus · 🐪 Camel trek / into Erg Chebbi · 🏰 Accommodation / 2 nights · 🍽️ **2 Meals** / 2 breakfasts, 2 dinners *(copy bug — subtitle describes 4)* · 🎶 Berber music / at night around the fire · 🌅 Sunrise climb / Dune climbing experience · 🛑 Stops / at Ait Ben Haddou… · 🏂 Sandboarding / Dune sandboarding · 🚐 Pickup / from your Riad/Hotel

### value_prop (11)

**group `why_us`** (4, emoji icons):
- 🚐 **Real Small Group** — 16 explorers, not 50. By Day 2, you'll know everyone's name.
- 🏕️ **Authentic Berber Camp** — Not a tourist resort. A real desert camp, run by the people of Erg Chebbi.
- 🌟 **Local Moroccan Team** — Born here. Drove these roads our whole lives. We don't read scripts.
- 💶 **Honest Budget Pricing** — No hidden fees. No surprise upgrades. Just the real Sahara at a fair price.

**group `trust`** (3, keyword SVG icons, no icon_label):
- `check` **Free Cancellation** — Enjoy 48h advance cancellation flexibility ⚠️ conflicts with the 7-day copy
- `star` **Book your spot with 20%** — Pay the rest on the day of the excursion
- `heart` **No hidden fees** — Clear pricing, no surprise surcharges

**group `about_values`** (4, keyword SVG icons, no icon_label):
- `minibus` **Small over big** — 16 travelers in a minibus, not 50 in a coach. Smaller groups mean real conversations, real flexibility, and a real connection to the land — not a parade.
- `landscape` **Real over polished** — Real Berber camp. Real Berber cooking. Real stories from real people who live here. We won't apologize if dinner isn't fancy — we'll be proud that it's authentic.
- `card` **Fair over cheap** — Our price is honest, not stripped-down. We pay our team properly. We pay the camp family properly. We just cut the middlemen — that's where the savings come from, not from cutting corners.
- `heart` **Local over corporate** — Every person you meet on this trip is Moroccan. Every dirham you spend stays in Morocco. We're not a French tour operator with a Marrakech booking office. We're from here.

### comparison_row (6)

| The usual | Ours |
|---|---|
| 40–50 people in a tourist coach | Max 16 in a minibus ⚠️ says 16 |
| Fixed tourist-menu meals | Real Berber-cooked dinners |
| Scripted commentary on loop | Stories from people born here |
| Big resort-style "luxury" camp | A real Berber-owned desert camp |
| Hidden fees, paid "extras" | One transparent price |
| €120–€150 starting price | From €85 — same Sahara |

### partner (6)

| Name | Badge | Description |
|---|---|---|
| Erg Chebbi Camps | Accommodation | Family-run Berber camps at the foot of the highest dunes in Morocco. |
| Atlas Discovery | Guiding | Expert mountain and desert guides certified by the Moroccan Ministry of Tourism. |
| Riad Kenza | Hospitality | Our Marrakech base: a riad run by the same family for three generations. |
| Sahara 4×4 | Transport | Local vehicle fleet kept in top condition by mechanics who live in the desert. |
| Amal Cooperative | Food & Culture | Women-led food cooperative preparing authentic Moroccan meals on every trip. |
| Green Trail Morocco | Sustainability | Partners in our zero-waste camping initiative and dune clean-up program. |

`AboutPartners.tsx` contains **no named partners** — just six anonymous scenery
photos plus prose. No overlap with `Partners.tsx`, and no way to pair a photo of
dunes with "Riad Kenza" without inventing the association, so every `image` and
`logo` is left unfilled.

### gallery_item (6)

| # | Kind | Alt | Height |
|---|---|---|---|
| 1 | photo | Kasbah village by the river | h-100 |
| 2 | photo | Traveler on a quad bike in the dunes | h-125 |
| 3 | video | Campfire glowing in the desert night | h-100 |
| 4 | photo | Berber guide in a blue robe | h-125 |
| 5 | photo | Rider on a camel crossing the Sahara | h-100 |
| 6 | video | Tour group posing in the desert | h-125 |

Both video items have a poster but **no video source** — `videoSrc` is unset in
the component, so only the still renders.

### site_settings (1 entry, 15 fields)

| Field | Value |
|---|---|
| `brand_name` | **UNFILLED — decide** |
| `tagline` | Real Sahara. / Fair price. / Stories you'll tell forever. |
| `whatsapp_url` | `#whatsapp` (placeholder) |
| `instagram_handle` | BudgetDesertTour |
| `instagram_url` | `#` (placeholder) |
| `tiktok_url` | `#` (placeholder) |
| `rating_value` | 4.9 |
| `rating_count_label` | Trusted by 3k+ people. |
| `travelers_hosted` | 9,000+ |
| `founded_label` | **UNFILLED — decide** |
| `deposit_percent` | 20 (consistent across 7 files) |
| `free_cancellation_hours` | **UNFILLED — decide** |
| `max_group_size` | 17 |
| `hero_video` | Shopify CDN mp4 URL — needs file reference |
| `hero_poster` | Unsplash URL — needs upload |

Note: the tagline is in `SiteNavbar`/`SiteFooter`, not `Hero`. There is only one
hero video/poster pair (on TrustBar); Hero itself is pure SVG layers.

---

## 3. Open decisions — need a human call

| Question | Option A | Option B | Affects |
|---|---|---|---|
| **Brand name** | "Budget Desert Tour" — all UI + every route meta title | "Chollodesierto" — about meta + the store domain | site_settings, every page title |
| **Founded year** | "Since 2015" — AboutValues stat | "Since 2017" — AboutStory prose | site_settings, about page |
| **Cancellation window** | 48 hours — TrustBar, mock-tours | 7 days (168h) — BookingBody, Faq, booking meta | site_settings, 1 faq_item, 1 value_prop |
| **Max group size** | 16 — 3 metaobjects say this | 17 — site_settings + booking UI enforce this | comparison_row, 2 value_props |

Minor, already decided but worth knowing: superior camp emoji is 🛀 (CampTiers)
vs 💍 (mock-tours); comfort is 👨‍👩‍👧 vs 👪. Live-component versions were used.

---

## 4. Blockers before anything can be written to Shopify

1. **No creation script exists.** `scripts/create-metaobject-entries.mjs` is not
   in the repo, nor is `data/metaobject-definitions.json` or
   `data/products.json`. Only `data/metaobject-entries.json` exists. Its shape is
   `{type: [{handle, fields}]}` — verify that matches whatever tooling will
   consume it.
2. **Wrong Storefront token.** `.env` has a `shpat_` Admin API token in
   `PUBLIC_STOREFRONT_API_TOKEN`; the store returns 401. Needs a bare 32-char
   Storefront public token. The admin token was exposed and should be rotated.
   `SESSION_SECRET` is also still a placeholder.
3. **Images not uploaded.** Every `image`/`logo`/`video` field is `REPLACE`.
   The whole site is backed by **9 distinct Unsplash photos** reused across
   unrelated slots — one file is captioned as the gates of Fez, a Marrakech night
   market, and a camel rider in three different components. They are
   placeholders; real photography is worth having first.
4. **`url`-typed fields will fail validation.** `whatsapp_url`,
   `instagram_url`, `tiktok_url` are `#whatsapp` / `#`.

---

## 5. Still outstanding beyond this batch

- `journey_day` metaobjects (largest remaining hardcoded block, `Journey.tsx`)
- `extra_option` / `transfer_option` metaobjects
- `/faq` renders `<Included />` instead of `<Faq />`
- `/routes` and `/reviews` render hardcoded data, ignoring their loaders
- `mapToCampTiers` never reads `price_delta`
- Departure availability has no model at all — no capacity, blackout dates, or
  inventory. Calendar will accept a sold-out date.
- Deposit mechanism undecided (copy promises 20% now, rest later)
- Booking form collects no contact details, pickup address, or traveller names
