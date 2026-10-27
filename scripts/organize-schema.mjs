/**
 * Makes the Shopify metaobject schema navigable for a non-developer.
 *
 *  1. Gives every definition a plain-English name, a description, and a
 *     displayNameKey, so Admin lists rows as "Choose your route." instead of
 *     "ui-string-xyz".
 *  2. Keeps `label` and `group` on ui_string in sync, so the website texts are
 *     grouped by where they appear rather than dumped in one flat list.
 *  3. Upserts every ui_string the code actually asks for, with its English
 *     text, a readable label, and a note saying where it shows up.
 *
 * Idempotent, and never overwrites a Text value already in the store — so it is
 * safe to run against a translated (e.g. Spanish) store.
 *
 * Usage: node scripts/organize-schema.mjs [--dry-run]
 */
import {resolveStore} from './store-env.mjs';

const DRY = process.argv.includes('--dry-run');

// Acts on the NEW_* store when that pair is set, so a clone can be driven
// from this repo without editing .env.
const {domain: STORE, token: TOKEN} = resolveStore({preferNew: true});

async function gql(query, variables) {
  const r = await fetch(`https://${STORE}/admin/api/2025-01/graphql.json`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN},
    body: JSON.stringify({query, variables}),
  });
  const j = await r.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors));
  return j.data;
}
const check = (payload, label) => {
  const errs = payload?.userErrors ?? [];
  if (errs.length) throw new Error(`${label}: ${JSON.stringify(errs)}`);
  return payload;
};

// ── 1. Definitions: readable names, descriptions, and row titles ────────────

const DEFINITIONS = {
  ui_string: {
    name: 'Website Text',
    displayNameKey: 'label',
    description:
      'Every button, label and short line of text on the website. Edit the Text field to change what visitors see. Never change the Key.',
  },
  page_section: {
    name: 'Page Section',
    displayNameKey: 'key',
    description:
      'The headings, intro paragraphs and images for one section of one page. The Key says which section it fills.',
  },
  tour_route: {
    name: 'Tour Route',
    displayNameKey: 'title',
    description: 'One of the desert routes shown on the homepage and the booking form.',
  },
  camp_tier: {
    name: 'Camp Tier',
    displayNameKey: 'name',
    description: 'A sleeping option (Shared, Comfort, Superior) and what it adds to the price.',
  },
  faq_item: {
    name: 'FAQ Item',
    displayNameKey: 'question',
    description: 'One question and answer. The Group field decides whether it shows on the FAQ page or the booking page.',
  },
  review: {
    name: 'Review',
    displayNameKey: 'author_name',
    description: 'A traveler review. The Placement field decides which page it appears on.',
  },
  journey_day: {
    name: 'Journey Day',
    displayNameKey: 'title',
    description: 'One day of the 3-day itinerary on the homepage.',
  },
  checklist_item: {
    name: 'Checklist Item',
    displayNameKey: 'text',
    description: "A single line in a what's-included or what-to-pack list.",
  },
  value_prop: {
    name: 'Value Prop',
    displayNameKey: 'title',
    description: 'A reason-to-book card ("Why choose us", "What we stand for").',
  },
  comparison_row: {
    name: 'Comparison Row',
    displayNameKey: 'ours',
    description: 'One row of the "other agencies vs us" table.',
  },
  partner: {
    name: 'Partner',
    displayNameKey: 'name',
    description: 'A partner or supplier shown on the About page.',
  },
  gallery_item: {
    name: 'Gallery Item',
    displayNameKey: 'alt',
    description: 'One photo or video in the homepage gallery.',
  },
  site_settings: {
    name: 'Site Settings',
    displayNameKey: 'brand_name',
    description: 'Brand name, WhatsApp link, social links and the numbers reused across the site. One entry only.',
  },
};

// ── 2. ui_string: the groups a non-developer navigates by, in page order ────

const GROUPS = [
  '01 · Header & footer',
  '02 · Homepage – Hero',
  '03 · Homepage – Routes',
  '04 · Homepage – Journey',
  '05 · Homepage – Camps',
  '06 · Homepage – Gallery',
  '07 · Homepage – Included & comparison',
  '08 · Homepage – Reviews',
  '09 · Homepage – FAQ',
  '10 · Booking page',
  '11 · About page',
  '12 · Journal (blog)',
  '13 · Contact page',
  '14 · Video & media',
  '15 · Page titles (SEO)',
  '16 · Screen-reader labels',
  '17 · Calendar & dates',
];

// Short aliases so the table below stays readable.
const G = Object.fromEntries(GROUPS.map((g) => [g.slice(5), g]));
const HEADER = G['Header & footer'];
const HERO = G['Homepage – Hero'];
const ROUTES = G['Homepage – Routes'];
const JOURNEY = G['Homepage – Journey'];
const CAMPS = G['Homepage – Camps'];
const GALLERY = G['Homepage – Gallery'];
const INCLUDED = G['Homepage – Included & comparison'];
const REVIEWS = G['Homepage – Reviews'];
const FAQ = G['Homepage – FAQ'];
const BOOKING = G['Booking page'];
const ABOUT = G['About page'];
const BLOG = G['Journal (blog)'];
const CONTACT = G['Contact page'];
const MEDIA = G['Video & media'];
const SEO = G['Page titles (SEO)'];
const SR = G['Screen-reader labels'];
const CAL = G['Calendar & dates'];

const SR_NOTE = 'Read aloud to screen readers, not visible on the page';

/**
 * key -> [English text, readable label, group, where it appears]
 * The English text must match the fallback in the t() call;
 * scripts/check-ui-strings.mjs reports keys that drift out of sync.
 */
const STRINGS = {
  // ── Header & footer ──
  'nav.book_now':            ['Book Now', 'Header — Book button', HEADER, 'Top-right button, every page'],
  'footer.deposit_line':     ['Book your spot with 20%.', 'Footer — Deposit line 1', HEADER, 'Footer, above the big button'],
  'footer.deposit_line_2':   ['Pay the rest on the day of the excursion.', 'Footer — Deposit line 2', HEADER, 'Footer, above the big button'],
  'footer.check_1':          ['Secure payment', 'Footer — Badge 1', HEADER, 'Footer trust badges'],
  'footer.check_2':          ['Free cancellation', 'Footer — Badge 2', HEADER, 'Footer trust badges'],
  'footer.check_3':          ['Verified local agency', 'Footer — Badge 3', HEADER, 'Footer trust badges'],
  'footer.cta':              ['Book Your Adventure Today', 'Footer — Main button', HEADER, 'Footer, links to the booking page'],
  'footer.whatsapp_prompt':  ['Or WhatsApp us if you’d rather talk first', 'Footer — WhatsApp prompt', HEADER, 'Footer, under the main button'],
  'footer.headline':         ['Your story starts at sunset.', 'Footer — Headline', HEADER, 'The big line at the top of the footer'],
  'footer.copyright':        ['© {year} {brand} ™. All rights reserved.', 'Footer — Copyright', HEADER, '{year} and {brand} are filled in automatically — keep them'],
  'footer.legal_terms':      ['Terms', 'Footer — Terms link', HEADER, 'Footer legal links'],
  'footer.legal_privacy':    ['Privacy', 'Footer — Privacy link', HEADER, 'Footer legal links'],
  'footer.legal_refund':     ['Refund Policy', 'Footer — Refund link', HEADER, 'Footer legal links'],

  // ── Homepage — hero ──
  'hero.heading':            ["The Epic 3-Day Desert Tour.\nA Story That Won't Let You Go.", 'Hero — Headline', HERO, 'Top of the homepage. Line breaks are kept.'],
  'hero.subtext':            ['Marrakech to the Sahara and back.\nSmall group, real Berber camp, fair price.\n', 'Hero — Text before the price', HERO, 'Homepage hero, runs into the price'],
  'hero.price':              ['€85', 'Hero — Highlighted price', HERO, 'Homepage hero, the underlined price'],
  'hero.subtext_after_price':['. And the Sahara becomes yours.', 'Hero — Text after the price', HERO, 'Homepage hero, continues after the price'],
  'hero.cta_primary':        ['Book Your Adventure →', 'Hero — Main button', HERO, 'Homepage hero, links to the booking page'],
  'hero.cta_secondary':      ['Watch the Journey ↓', 'Hero — Second button', HERO, 'Homepage hero, scrolls to the itinerary'],

  // ── Homepage — routes ──
  'routes.free_cancellation':['Free Cancellation', 'Routes — Photo badge', ROUTES, 'Route card, on the photo'],
  'routes.per_person':       ['Per person', 'Routes — Price label', ROUTES, 'Route card price bar'],
  'routes.cta':              ['Choose this route', 'Routes — Card button', ROUTES, 'Route card, links to the booking page'],

  // ── Homepage — journey ──
  'journey.highlights_title':['What you’ll see today', 'Journey — Highlights heading', JOURNEY, 'Above each day’s bullet list'],
  'journey.cta':             ['Start your Journey Today', 'Journey — Button', JOURNEY, 'Under the intro, links to the booking page'],
  'journey.intro_emoji':     ['\u{1F60E}', 'Journey — Intro emoji', JOURNEY, 'Decorative. Paste any emoji, or clear it to hide.'],
  'journey.cta_emoji':       ['\u{1F609}', 'Journey — Button emoji', JOURNEY, 'Decorative, sits after the button text.'],
  'journey.why_bubble':      ['Here’s why.', 'Journey — Speech bubble', JOURNEY, 'The little dark bubble next to the emoji'],

  // ── Homepage — routes (continued) ──
  'routes.days_unit':        ['Days', 'Routes — "Days" after the number', ROUTES, 'Route card photo. The number comes from the Tour Route.'],

  // ── Homepage — included & comparison ──
  'about.values_eyebrow':    ['Our Values', 'About — Values eyebrow', ABOUT, 'Page Section about.values wins if set'],
  'about.values_heading':    ['Four things we believe in.', 'About — Values heading', ABOUT, 'Page Section about.values wins if set'],
  'about.network_eyebrow':   ['Who we work with', 'About — Partner list eyebrow', ABOUT, 'Page Section about.network wins if set'],
  'about.network_heading':   ['A network built on trust.', 'About — Partner list heading', ABOUT, 'Page Section about.network wins if set'],
  'about.network_subtext':   ['Every partner we work with was chosen for quality, authenticity, and their deep roots in Moroccan culture.', 'About — Partner list intro', ABOUT, 'Page Section about.network wins if set'],

  // ── Homepage — camps ──
  'camps.best_for':          ['Best for', 'Camps — "Best for" label', CAMPS, 'Camp tier card'],
  'camps.cta':               ['Book Now', 'Camps — Button', CAMPS, 'Under the camp tiers, links to the booking page'],

  // ── Homepage — gallery ──
  'gallery.tag_prefix':      ['Tag', 'Gallery — Before the handle', GALLERY, 'Gallery footer line'],
  'gallery.tag_suffix':      ['to be featured.', 'Gallery — After the handle', GALLERY, 'Gallery footer line'],

  // ── Homepage — reviews ──
  'reviews.verified':        ['Verified traveler', 'Reviews — Verified badge', REVIEWS, 'Testimonial card'],
  'reviews.cta_primary':     ['Book the Journey Now', 'Reviews — Main button', REVIEWS, 'Under the reviews, links to the booking page'],
  'reviews.cta_secondary':   ['Read all Reviews →', 'Reviews — Second button', REVIEWS, 'Under the reviews, links to the reviews page'],

  // ── Homepage — FAQ ──
  'faq.still_questions':     ['Still have questions?', 'FAQ — Closing line', FAQ, 'Bottom of the FAQ section'],
  'faq.chat_whatsapp':       ['Chat on WhatsApp', 'FAQ — WhatsApp button', FAQ, 'Bottom of the FAQ section'],
  'faq.whatsapp_note':       ['WhatsApp us — we usually answer within an hour.', 'FAQ — WhatsApp note', FAQ, 'Above the WhatsApp button'],
  'faq.hero_heading':        ['Everything you asked.', 'FAQ — Hero heading', FAQ, 'Page Section faq.hero wins if set'],
  'faq.hero_subtext':        ['The questions travelers send us most, answered in plain words.', 'FAQ — Hero subtext', FAQ, 'Page Section faq.hero wins if set'],

  // ── Reviews page ──
  'reviews.heading':         ['What travelers are saying', 'Reviews page — Heading', REVIEWS, 'Page Section reviews.index wins if set'],
  'reviews.hero_heading':    ['Straight from the camp.', 'Reviews — Hero heading', REVIEWS, 'Page Section reviews.hero wins if set'],
  'reviews.hero_subtext':    ['Unfiltered words from people who actually made the trip.', 'Reviews — Hero subtext', REVIEWS, 'Page Section reviews.hero wins if set'],

  // ── Booking page — steps ──
  'booking.step1_title':     ['Choose your route.', 'Step 1 — Title', BOOKING, 'Booking form, step 1'],
  'booking.step1_desc':      ['Where do you start, where do you end?', 'Step 1 — Description', BOOKING, 'Booking form, step 1'],
  'booking.step2_title':     ['Choose your camp.', 'Step 2 — Title', BOOKING, 'Booking form, step 2'],
  'booking.step2_desc':      ['Same stars. Same fire. Different pillow.', 'Step 2 — Description', BOOKING, 'Booking form, step 2'],
  'booking.step3_title':     ['Pick your date.', 'Step 3 — Title', BOOKING, 'Booking form, step 3'],
  'booking.step3_desc':      ['When do you want to leave?', 'Step 3 — Description', BOOKING, 'Booking form, step 3'],
  'booking.step4_title':     ['How many travelers?', 'Step 4 — Title', BOOKING, 'Booking form, step 4'],
  'booking.travelers_required':['Please choose how many travelers are coming.', 'Step 4 — Error', BOOKING, 'Shown if they reserve with 0 travelers'],
  'booking.step4_desc':      ['Solo? Couple? Whole crew? Up to 17.', 'Step 4 — Description', BOOKING, 'Booking form, step 4'],
  'booking.step5_title':     ['Make your adventure more fun.', 'Step 5 — Title', BOOKING, 'Booking form, step 5 (extras)'],
  'booking.step5_desc':      ['Optional activities to make your journey more enjoyable.', 'Step 5 — Description', BOOKING, 'Booking form, step 5 (extras)'],
  'booking.per_person':      ['Per Person', 'Route card — Price label', BOOKING, 'Booking form, step 1 route cards'],
  'booking.hero_heading':    ['Book your adventure.', 'Booking — Hero heading', BOOKING, 'Page Section booking.hero wins if set'],
  'booking.hero_subtext':    ["Five quick choices, and you're going. We'll handle the rest.", 'Booking — Hero subtext', BOOKING, 'Page Section booking.hero wins if set'],
  'booking.quad_label':      ['{variant} Quad', 'Extras — Quad name', BOOKING, '{variant} is the product variant ("Individual" / "Double") — keep it'],

  // ── Order details sent to the booking system ──
  'booking.attr_arrival_date':['Arrival date', 'Order — Arrival date label', BOOKING, 'The line the shopper sees in their confirmation email'],
  'booking.attr_date_value': ['{day} {month} {year}', 'Order — Arrival date format', BOOKING, 'Reorder for your language. Keep {day}, {month} and {year}.'],
  'booking.attr_tour_type':  ['Tour type', 'Order — Tour type label', BOOKING, 'Shown in the confirmation email'],

  // ── Booking page — extras and transfer ──
  'booking.per_quad':        ['Per quad', 'Extras — Price label', BOOKING, 'Quad bike ticket card'],
  'booking.extra_qty_prefix':['How many', 'Extras — Question start', BOOKING, 'Reads "How many quads do you need?"'],
  'booking.extra_qty_suffix':['do you need?', 'Extras — Question end', BOOKING, 'Reads "How many quads do you need?"'],
  'booking.comfort_heading': ['We care about your comfort!', 'Transfer — Heading', BOOKING, 'Booking form, above the transfer question'],
  'booking.transfer_question':['Would you like airport transfer?', 'Transfer — Question', BOOKING, 'Booking form, step 5'],
  'booking.yes':             ['Yes', 'Transfer — Yes', BOOKING, 'Booking form toggle'],
  'booking.no':              ['No', 'Transfer — No', BOOKING, 'Booking form toggle'],
  'booking.transfer_oneway': ['One way', 'Transfer — One way', BOOKING, 'Booking form toggle'],
  'booking.transfer_return': ['Return', 'Transfer — Return', BOOKING, 'Booking form toggle'],
  'booking.total_transfer':  ['Total transfer', 'Transfer — Price label', BOOKING, 'Transfer card'],
  'booking.travelers_word':  ['Travelers', 'Transfer — "Travelers"', BOOKING, 'Transfer card, after the number'],
  'booking.vehicle_one':     ['1 Vehicle', 'Transfer — Vehicle count', BOOKING, 'Transfer card'],

  // ── Booking page — summary ──
  'booking.summary_title':   ['Your Trip Summary', 'Summary — Title', BOOKING, 'Booking page sidebar'],
  'booking.summary_route':   ['The Route', 'Summary — Route heading', BOOKING, 'Booking page sidebar'],
  'booking.summary_camp':    ['Where You’ll Sleep', 'Summary — Camp heading', BOOKING, 'Booking page sidebar'],
  'booking.summary_transfer':['Airport transfer', 'Summary — Transfer heading', BOOKING, 'Booking page sidebar'],
  'booking.summary_when':    ['When You’ll Leave', 'Summary — Date heading', BOOKING, 'Booking page sidebar'],
  'booking.summary_travelers':['Nbr of Travelers', 'Summary — Travelers heading', BOOKING, 'Booking page sidebar'],
  'booking.included':        ['Included', 'Summary — "Included"', BOOKING, 'Shown when the camp costs nothing extra'],
  'booking.in_price':        ['In price', 'Summary — "In price"', BOOKING, 'Camp ticket, when nothing extra'],
  'booking.per_person_short':['Per person', 'Summary — "Per person"', BOOKING, 'Camp ticket, when there is a surcharge'],
  'booking.traveler_one':    ['traveler', 'Summary — "traveler" (one)', BOOKING, 'Reads "1 traveler"'],
  'booking.traveler_many':   ['travelers', 'Summary — "travelers" (many)', BOOKING, 'Reads "4 travelers"'],
  'booking.total_price':     ['Total price', 'Summary — Total label', BOOKING, 'On the reserve button'],
  'booking.reserve_cta':     ['Reserve your spot', 'Summary — Reserve button', BOOKING, 'Starts checkout'],
  'booking.reserving':       ['Reserving…', 'Summary — Reserve button (busy)', BOOKING, 'While checkout is loading'],
  'booking.trust_1':         ['Free cancellation up to 48h before', 'Summary — Badge 1', BOOKING, 'Under the reserve button'],
  'booking.trust_2':         ['Book your spot with 20%', 'Summary — Badge 2', BOOKING, 'Under the reserve button'],
  'booking.trust_3':         ['Clear pricing, no surprise surcharges', 'Summary — Badge 3', BOOKING, 'Under the reserve button'],

  // ── Booking page — WhatsApp and lower sections ──
  'booking.whatsapp_question':['Questions before you book?', 'WhatsApp — Question', BOOKING, 'Booking page sidebar, green box'],
  'booking.whatsapp_cta':    ['Chat on WhatsApp', 'WhatsApp — Button', BOOKING, 'Booking page sidebar, green box'],
  'booking.whatsapp_note_1': ['WhatsApp us', 'WhatsApp — Note line 1', BOOKING, 'Under the WhatsApp button'],
  'booking.whatsapp_note_2': ['We usually answer within an hour.', 'WhatsApp — Note line 2', BOOKING, 'Under the WhatsApp button'],
  'booking.price_heading':   ['What’s in the price', "What's included — Heading", BOOKING, 'Below the booking form'],
  'booking.price_sub':       ['Everything you need for an unforgettable adventure:', "What's included — Intro", BOOKING, 'Below the booking form'],
  'booking.faq_heading':     ['Questions about booking?', 'FAQ — Heading', BOOKING, 'Bottom of the booking page'],

  // ── About page ──
  'about.hero_cta':          ['Book Your Adventure', 'About — Hero button', ABOUT, 'Top of the About page, links to the booking page'],
  'about.stat_travelers':    ['Travelers hosted', 'About — Statistic 1 caption', ABOUT, 'Under the values cards'],
  'about.stat_rating':       ['Trusted by 3k people', 'About — Statistic 2 caption', ABOUT, 'Falls back to the Site Settings rating label'],
  'about.stat_agency':       ['Local agency', 'About — Statistic 3 caption', ABOUT, 'Under the values cards'],
  'about.supports_emoji':    ['\u{270C}\u{1F9E1}', 'About — Supports emoji', ABOUT, 'Decorative, under the "Who your booking supports" statement.'],
  'about.partners_emoji':    ['\u{1F602}\u{1F44C}', 'About — Partners emoji', ABOUT, 'Decorative, under the partners statement.'],

  // ── Journal (blog) ──
  'blog.heading':            ['Notes from the desert.', 'Journal — Heading', BLOG, 'Page Section blog.index wins if set'],
  'blog.hero_subtext':       ['Field notes, routes and small lessons from the Sahara.', 'Journal — Hero subtext', BLOG, 'Page Section blog.index subheading wins if set'],
  'blog.empty_title':        ['Nothing published yet.', 'Journal — Empty heading', BLOG, 'Shown when no posts are published'],
  'blog.empty_body':         ['We’re writing up route notes and traveler stories. Check back soon, or get in touch if there’s something you’d like us to cover.', 'Journal — Empty text', BLOG, 'Shown when no posts are published'],
  'blog.empty_cta':          ['Get in touch', 'Journal — Empty link', BLOG, 'Links to the contact page'],
  'post.back_to_journal':    ['Journal', 'Post — Back link', BLOG, 'Top of a post, links back to the listing'],
  'post.recent_eyebrow':     ['Recent Stories', 'Post — Recent stories eyebrow', BLOG, 'Page Section blog.post wins if set'],
  'post.recent_heading':     ['From the Sahara', 'Post — Recent stories heading', BLOG, 'Page Section blog.post wins if set'],
  'post.recent_subtitle':    ['Guides, tips, and tales from the Sahara written by people who actually live here.', 'Post — Recent stories intro', BLOG, 'Page Section blog.post wins if set'],
  'post.see_all':            ['See All Stories', 'Post — See all button', BLOG, 'Bottom of every post, links to the journal'],
  'aria.post.recent':        ['Recent stories', 'Post — Recent stories section', SR, SR_NOTE],
  'blog.date_format':        ['{day} {month} {year}', 'Journal — Date format', BLOG, 'Reorder for your language. Keep {day}, {month} and {year}. The month name comes from group 17.'],
  'blog.date_short':         ['{month} {day}, {year}', 'Journal — Short date format', BLOG, 'The compact date on cards. Keep {day}, {month} and {year}.'],
  'blog.read_time':          ['{minutes} min read', 'Journal — Reading time', BLOG, 'Counted from the post length. Keep {minutes}.'],
  'blog.category_all':       ['All', 'Journal — "All" filter', BLOG, 'First button in the category filter'],
  'blog.featured':           ['Featured', 'Journal — Featured ribbon', BLOG, 'Vertical label on the top post'],
  'blog.read_story':         ['Read the story', 'Journal — Featured link', BLOG, 'On the featured post card'],
  'blog.load_more':          ['Load more', 'Journal — Load more button', BLOG, 'Below the post grid'],
  'aria.blog.filter':        ['Filter stories', 'Journal — Category filter', SR, SR_NOTE],

  // ── Contact page ──
  'contact.heading':         ['Get in touch.', 'Contact — Heading', CONTACT, 'Hero heading. Page Section contact.hero wins if set'],
  'contact.hero_subtext':    ['Questions before you book? We answer every message — usually within the hour.', 'Contact — Hero subtext', CONTACT, 'Page Section contact.hero wins if set'],
  'contact.whatsapp_heading':['Chat with us', 'Contact — WhatsApp heading', CONTACT, 'First card'],
  'contact.whatsapp_body':   ['WhatsApp us if you’d rather talk first — we usually answer within an hour.', 'Contact — WhatsApp text', CONTACT, 'First card'],
  'contact.whatsapp_cta':    ['Chat on WhatsApp', 'Contact — WhatsApp button', CONTACT, 'First card'],
  'contact.whatsapp_missing':['Our WhatsApp number isn’t published yet.', 'Contact — WhatsApp missing', CONTACT, 'Shown when Site Settings has no WhatsApp link'],
  'contact.social_heading':  ['Find us', 'Contact — Social heading', CONTACT, 'Second card'],
  'contact.social_tag':      ['Tag', 'Contact — Before the handle', CONTACT, 'Reads "Tag @handle"'],
  'contact.social_missing':  ['Our social links aren’t published yet.', 'Contact — Social missing', CONTACT, 'Shown when Site Settings has no social links'],
  'contact.social_link_missing':['(link not available)', 'Contact — Dead social icon', CONTACT, SR_NOTE],
  'contact.form_heading':    ['Send a message', 'Contact — Form heading', CONTACT, 'Message form'],
  'contact.form_body':       ['Prefer email? Use the form — or message us on WhatsApp for a faster reply.', 'Contact — Form intro', CONTACT, 'Message form'],
  'contact.field_name':      ['Name', 'Contact — Name field', CONTACT, 'Message form'],
  'contact.field_email':     ['Email', 'Contact — Email field', CONTACT, 'Message form'],
  'contact.field_message':   ['Message', 'Contact — Message field', CONTACT, 'Message form'],
  'contact.form_cta':        ['Send message', 'Contact — Form button', CONTACT, 'Message form'],
  'contact.form_disabled':   ['This form isn’t connected yet — please use WhatsApp for now.', 'Contact — Form notice', CONTACT, 'The form has no backend yet'],

  // ── Video & media ──
  'media.video_preview':     ['Video preview', 'Video — Placeholder', MEDIA, 'Shown when a section has a photo but no video'],
  'media.video_coming_soon': ['Video coming soon', 'Gallery video — Placeholder', MEDIA, 'Gallery video popup with no video yet'],

  // ── Page titles (SEO) — the browser tab and the Google result ──
  'meta.home.title':         ['Budget Desert Tour — 3-Day Marrakech to Sahara from €85', 'Homepage — Title', SEO, 'Browser tab and Google result'],
  'meta.home.description':   ['3-day small group desert tour from Marrakech to the Sahara. Real Berber camp, camel trek, fair price from €85.', 'Homepage — Description', SEO, 'The grey text under the Google result'],
  'meta.booking.title':      ['Book Your Desert Tour — Budget Desert Tour', 'Booking — Title', SEO, 'Browser tab and Google result'],
  'meta.booking.description':['Book your 3-day Sahara desert tour from €85. Reserve with just 20% deposit. Free cancellation up to 48 hours before departure.', 'Booking — Description', SEO, 'The grey text under the Google result'],
  'meta.about.title':        ['About Us — Chollodesierto', 'About — Title', SEO, 'Browser tab and Google result'],
  'meta.about.description':  ["Learn how Chollodesierto was born from a bad tour into one of Morocco's most trusted budget desert experiences.", 'About — Description', SEO, 'The grey text under the Google result'],
  'meta.reviews.title':      ['Traveler Reviews — Budget Desert Tour', 'Reviews — Title', SEO, 'Browser tab and Google result'],
  'meta.reviews.description':['Read honest reviews from travelers who joined our 3-day Sahara desert tour from Marrakech.', 'Reviews — Description', SEO, 'The grey text under the Google result'],
  'meta.faq.title':          ['FAQ', 'FAQ — Title', SEO, 'The brand name is added after it automatically'],
  'meta.faq.description':    ['Answers to the most common questions about our 3-day Sahara desert tour from Marrakech.', 'FAQ — Description', SEO, 'The grey text under the Google result'],
  'meta.contact.title':      ['Contact', 'Contact — Title', SEO, 'The brand name is added after it automatically'],
  'meta.contact.description':['Get in touch about your 3-day Sahara desert tour — message us on WhatsApp or find us on social.', 'Contact — Description', SEO, 'The grey text under the Google result'],
  'meta.blog.title':         ['Journal', 'Journal — Title', SEO, 'The brand name is added after it automatically'],
  'meta.blog.description':   ['Stories, route notes and practical advice from our guides in the Moroccan Sahara.', 'Journal — Description', SEO, 'The grey text under the Google result'],
  'meta.post.not_found':     ['Post not found', 'Post — Missing title', SEO, 'Tab title when a post URL is wrong'],

  // ── Screen-reader labels — invisible, read aloud by assistive tech ──
  'aria.trust.section':      ['Book your desert adventure', 'Homepage — Video section', SR, SR_NOTE],
  'aria.trust.play':         ['Play excursion video', 'Homepage — Play button', SR, SR_NOTE],
  'aria.trust.video':        ['Excursion video', 'Homepage — Video popup', SR, SR_NOTE],
  'aria.trust.close_video':  ['Close video', 'Homepage — Close video', SR, SR_NOTE],
  'aria.why_us.section':     ['Why travelers keep choosing us', 'Homepage — Why-us section', SR, SR_NOTE],
  'aria.routes.section':     ['Choose your route', 'Homepage — Routes section', SR, SR_NOTE],
  'aria.routes.medal':       ['Medal', 'Homepage — Medal icon', SR, SR_NOTE],
  'aria.journey.section':    ['The journey, day by day', 'Homepage — Journey section', SR, SR_NOTE],
  'aria.journey.why':        ["Here's why.", 'Homepage — Journey intro', SR, SR_NOTE],
  'aria.journey.emoji_intro':['Smiling face with sunglasses', 'Journey — Intro emoji', SR, SR_NOTE],
  'aria.journey.emoji_quote':['Winking face', 'Journey — Quote emoji', SR, SR_NOTE],
  'aria.journey.emoji_day':  ['Cool face', 'Journey — Day emoji', SR, SR_NOTE],
  'aria.journey.prev_photo': ['Previous photo', 'Journey — Previous photo', SR, SR_NOTE],
  'aria.journey.next_photo': ['Next photo', 'Journey — Next photo', SR, SR_NOTE],
  'aria.camps.section':      ["Where you'll sleep", 'Homepage — Camps section', SR, SR_NOTE],
  'aria.gallery.section':    ['Captured by the tribe', 'Homepage — Gallery section', SR, SR_NOTE],
  'aria.gallery.close_video':['Close video', 'Gallery — Close video', SR, SR_NOTE],
  'aria.included.section':   ["What's in the price and what to bring", 'Homepage — Included section', SR, SR_NOTE],
  'aria.included.emoji':     ['Backpack', 'Included — Backpack emoji', SR, SR_NOTE],
  'aria.comparison.section': ['Honest comparison', 'Homepage — Comparison section', SR, SR_NOTE],
  'aria.comparison.emoji_them':['Unamused face', 'Comparison — Them emoji', SR, SR_NOTE],
  'aria.comparison.emoji_us':['Smiling face with heart-eyes', 'Comparison — Us emoji', SR, SR_NOTE],
  'aria.reviews.section':    ['Traveler stories', 'Homepage — Reviews section', SR, SR_NOTE],
  'aria.faq.section':        ['Frequently asked questions', 'FAQ — Section', SR, SR_NOTE],
  'aria.faq.emoji':          ['Thinking face', 'FAQ — Thinking emoji', SR, SR_NOTE],
  'aria.about.hero':         ['About us', 'About — Hero section', SR, SR_NOTE],
  'aria.about.story':        ['Our story', 'About — Story section', SR, SR_NOTE],
  'aria.about.partners':     ['Our partners', 'About — Partners section', SR, SR_NOTE],
  'aria.about.values':       ['Our values', 'About — Values section', SR, SR_NOTE],
  'aria.about.supports':     ['Who your booking supports', 'About — Supports section', SR, SR_NOTE],
  'aria.booking.hero':       ['Book your adventure', 'Booking — Hero section', SR, SR_NOTE],
  'aria.contact.hero':       ['Contact us', 'Contact — Hero section', SR, SR_NOTE],
  'aria.contact.section':    ['Contact us', 'Contact — Section', SR, SR_NOTE],
  'aria.faq.hero':           ['Frequently asked questions', 'FAQ — Hero section', SR, SR_NOTE],
  'aria.reviews.hero':       ['Traveler reviews', 'Reviews — Hero section', SR, SR_NOTE],
  'aria.blog.hero':          ['Journal', 'Journal — Hero section', SR, SR_NOTE],
  'aria.contact.whatsapp':   ['Chat with us on WhatsApp', 'Contact — WhatsApp button', SR, SR_NOTE],
  'booking.aria_form':       ['Booking form', 'Booking form', SR, SR_NOTE],
  'booking.aria_summary':    ['Your trip summary', 'Trip summary panel', SR, SR_NOTE],
  'booking.aria_prev_month': ['Previous month', 'Calendar — Previous', SR, SR_NOTE],
  'booking.aria_next_month': ['Next month', 'Calendar — Next', SR, SR_NOTE],
  'booking.aria_decrease_travelers':['Decrease travelers', 'Travelers — Minus button', SR, SR_NOTE],
  'booking.aria_increase_travelers':['Increase travelers', 'Travelers — Plus button', SR, SR_NOTE],
  'booking.aria_decrease':   ['Decrease', 'Extras — Minus button', SR, SR_NOTE],
  'booking.aria_increase':   ['Increase', 'Extras — Plus button', SR, SR_NOTE],
  'booking.aria_whatsapp':   ['Chat with us on WhatsApp', 'Booking — WhatsApp button', SR, SR_NOTE],
  'booking.aria_calendar':   ['Calendar', 'Summary — Calendar emoji', SR, SR_NOTE],
  'booking.aria_travelers_emoji':['Travelers', 'Summary — Travelers emoji', SR, SR_NOTE],
  'booking.aria_thinking':   ['Thinking', 'Booking — Thinking emoji', SR, SR_NOTE],
  'aria.rating':             ['Rated {rating} out of 5', 'Star rating', SR, `${SR_NOTE}. {rating} is filled in automatically — keep it.`],
  'aria.journey.expand_day': ['Expand day details', 'Journey — Expand a day', SR, SR_NOTE],
  'aria.journey.collapse_day':['Collapse day details', 'Journey — Collapse a day', SR, SR_NOTE],
  'aria.gallery.prev':       ['Previous photos', 'Gallery — Previous', SR, SR_NOTE],
  'aria.gallery.next':       ['Next photos', 'Gallery — Next', SR, SR_NOTE],
  'aria.gallery.play_video': ['Play video: {name}', 'Gallery — Play a video', SR, `${SR_NOTE}. {name} is the photo's description — keep it.`],
  'aria.reviews.prev':       ['Previous stories', 'Reviews — Previous', SR, SR_NOTE],
  'aria.reviews.next':       ['Next stories', 'Reviews — Next', SR, SR_NOTE],
  'aria.nav.open_menu':      ['Open menu', 'Header — Open menu', SR, SR_NOTE],
  'aria.nav.close_menu':     ['Close menu', 'Header — Close menu', SR, SR_NOTE],
  'aria.footer.legal':       ['Legal', 'Footer — Legal links', SR, SR_NOTE],

  // ── Calendar & dates — the booking form's date picker ──
  'booking.when_leave':      ['{day}, {month} {date}', 'Departure date format', CAL, 'Reorder the pieces for your language. Keep {day}, {month} and {date}.'],
  'cal.mon':                 ['Mo', 'Monday (1 letter)', CAL, 'Calendar column headers'],
  'cal.tue':                 ['Tu', 'Tuesday (short)', CAL, 'Calendar column headers'],
  'cal.wed':                 ['We', 'Wednesday (short)', CAL, 'Calendar column headers'],
  'cal.thu':                 ['Th', 'Thursday (short)', CAL, 'Calendar column headers'],
  'cal.fri':                 ['Fr', 'Friday (short)', CAL, 'Calendar column headers'],
  'cal.sat':                 ['Sa', 'Saturday (short)', CAL, 'Calendar column headers'],
  'cal.sun':                 ['Su', 'Sunday (short)', CAL, 'Calendar column headers'],
  'cal.january':             ['January', 'January', CAL, 'Calendar month heading'],
  'cal.february':            ['February', 'February', CAL, 'Calendar month heading'],
  'cal.march':               ['March', 'March', CAL, 'Calendar month heading'],
  'cal.april':               ['April', 'April', CAL, 'Calendar month heading'],
  'cal.may':                 ['May', 'May', CAL, 'Calendar month heading'],
  'cal.june':                ['June', 'June', CAL, 'Calendar month heading'],
  'cal.july':                ['July', 'July', CAL, 'Calendar month heading'],
  'cal.august':              ['August', 'August', CAL, 'Calendar month heading'],
  'cal.september':           ['September', 'September', CAL, 'Calendar month heading'],
  'cal.october':             ['October', 'October', CAL, 'Calendar month heading'],
  'cal.november':            ['November', 'November', CAL, 'Calendar month heading'],
  'cal.december':            ['December', 'December', CAL, 'Calendar month heading'],
  'cal.short_sun':           ['Sun', 'Sunday (3 letters)', CAL, 'Used in "Sun, Sep 21"'],
  'cal.short_mon':           ['Mon', 'Monday (3 letters)', CAL, 'Used in "Mon, Sep 21"'],
  'cal.short_tue':           ['Tue', 'Tuesday (3 letters)', CAL, 'Used in the departure date'],
  'cal.short_wed':           ['Wed', 'Wednesday (3 letters)', CAL, 'Used in the departure date'],
  'cal.short_thu':           ['Thu', 'Thursday (3 letters)', CAL, 'Used in the departure date'],
  'cal.short_fri':           ['Fri', 'Friday (3 letters)', CAL, 'Used in the departure date'],
  'cal.short_sat':           ['Sat', 'Saturday (3 letters)', CAL, 'Used in the departure date'],
  'cal.short_jan':           ['Jan', 'Jan (3 letters)', CAL, 'Used in the departure date'],
  'cal.short_feb':           ['Feb', 'Feb (3 letters)', CAL, 'Used in the departure date'],
  'cal.short_mar':           ['Mar', 'Mar (3 letters)', CAL, 'Used in the departure date'],
  'cal.short_apr':           ['Apr', 'Apr (3 letters)', CAL, 'Used in the departure date'],
  'cal.short_may':           ['May', 'May (3 letters)', CAL, 'Used in the departure date'],
  'cal.short_jun':           ['Jun', 'Jun (3 letters)', CAL, 'Used in the departure date'],
  'cal.short_jul':           ['Jul', 'Jul (3 letters)', CAL, 'Used in the departure date'],
  'cal.short_aug':           ['Aug', 'Aug (3 letters)', CAL, 'Used in the departure date'],
  'cal.short_sep':           ['Sep', 'Sep (3 letters)', CAL, 'Used in the departure date'],
  'cal.short_oct':           ['Oct', 'Oct (3 letters)', CAL, 'Used in the departure date'],
  'cal.short_nov':           ['Nov', 'Nov (3 letters)', CAL, 'Used in the departure date'],
  'cal.short_dec':           ['Dec', 'Dec (3 letters)', CAL, 'Used in the departure date'],
};

const slug = (k) => 's-' + k.replace(/[._]/g, '-').toLowerCase();

// ── Run ─────────────────────────────────────────────────────────────────────

const defs = (
  await gql(`query {
    metaobjectDefinitions(first: 50) {
      nodes { id type name displayNameKey description
        fieldDefinitions { key name validations { name value } } }
    }
  }`)
).metaobjectDefinitions.nodes;
const byType = Object.fromEntries(defs.map((d) => [d.type, d]));

// 1. ui_string's organising fields. The `group` dropdown's allowed values are
//    re-asserted every run, so adding a group here is all it takes.
const uiDef = byType.ui_string;
if (!uiDef) throw new Error('ui_string definition not found');
const uiFields = new Map(uiDef.fieldDefinitions.map((f) => [f.key, f]));

const uiFieldEdits = [];
if (!uiFields.has('label')) {
  uiFieldEdits.push({
    create: {
      key: 'label',
      name: 'Label',
      type: 'single_line_text_field',
      description: 'A short name for this text, so you can find it in the list.',
      required: false,
    },
  });
}
const groupChoices = JSON.stringify(GROUPS);
if (!uiFields.has('group')) {
  uiFieldEdits.push({
    create: {
      key: 'group',
      name: 'Where it appears',
      type: 'single_line_text_field',
      description: 'Which page or section this text belongs to.',
      required: false,
      validations: [{name: 'choices', value: groupChoices}],
    },
  });
} else {
  const current = uiFields.get('group').validations?.find((v) => v.name === 'choices')?.value;
  if (current !== groupChoices) {
    uiFieldEdits.push({
      update: {
        key: 'group',
        name: 'Where it appears',
        description: 'Which page or section this text belongs to.',
        validations: [{name: 'choices', value: groupChoices}],
      },
    });
  }
}
uiFieldEdits.push(
  {update: {key: 'key', name: 'Key (do not change)', description: 'The website looks up this text by its Key. Changing it breaks the text on the site.'}},
  {update: {key: 'value', name: 'Text', description: 'What visitors actually see. This is the field to translate.'}},
  {update: {key: 'note', name: 'Notes', description: 'Extra context about where this text shows up.'}},
);

if (DRY) {
  console.log(`[dry-run] ui_string: ${uiFieldEdits.length} field edits`);
} else {
  const r = await gql(
    `mutation U($id: ID!, $d: MetaobjectDefinitionUpdateInput!) {
       metaobjectDefinitionUpdate(id: $id, definition: $d) {
         metaobjectDefinition { fieldDefinitions { key } } userErrors { field message } } }`,
    {id: uiDef.id, d: {fieldDefinitions: uiFieldEdits}},
  );
  check(r.metaobjectDefinitionUpdate, 'ui_string fields');
  console.log(`ui_string: fields ready, ${GROUPS.length} groups allowed`);
}

// 2. Names, descriptions and row titles for every definition.
for (const [type, want] of Object.entries(DEFINITIONS)) {
  const def = byType[type];
  if (!def) {
    console.log(`skip ${type}: not in this store`);
    continue;
  }
  if (
    def.name === want.name &&
    def.displayNameKey === want.displayNameKey &&
    def.description === want.description
  ) {
    continue;
  }
  if (DRY) {
    console.log(`[dry-run] ${type}: display=${want.displayNameKey}`);
    continue;
  }
  try {
    const r = await gql(
      `mutation U($id: ID!, $d: MetaobjectDefinitionUpdateInput!) {
         metaobjectDefinitionUpdate(id: $id, definition: $d) {
           metaobjectDefinition { type displayNameKey } userErrors { field message } } }`,
      {id: def.id, d: {name: want.name, description: want.description, displayNameKey: want.displayNameKey}},
    );
    check(r.metaobjectDefinitionUpdate, type);
    console.log(`set  ${type}`);
  } catch (e) {
    // A displayNameKey Shopify rejects shouldn't stop the other definitions.
    console.log(`FAIL ${type}: ${e.message}`);
  }
}

// 3. Upsert every string the code asks for.
const existing = new Map();
let cursor = null;
do {
  const page = await gql(
    `query P($after: String) { metaobjects(type: "ui_string", first: 250, after: $after) {
       nodes { id handle fields { key value } }
       pageInfo { hasNextPage endCursor } } }`,
    {after: cursor},
  );
  for (const n of page.metaobjects.nodes) existing.set(n.handle, n);
  cursor = page.metaobjects.pageInfo.hasNextPage ? page.metaobjects.pageInfo.endCursor : null;
} while (cursor);

let created = 0;
let updated = 0;
let unchanged = 0;
for (const [key, [value, label, group, note]] of Object.entries(STRINGS)) {
  const handle = slug(key);
  const fields = [
    {key: 'key', value: key},
    {key: 'value', value},
    {key: 'label', value: label},
    {key: 'group', value: group},
    {key: 'note', value: note},
  ];
  const found = existing.get(handle);

  if (!found) {
    if (DRY) {
      console.log(`[dry-run] create ${handle}`);
      created++;
      continue;
    }
    const r = await gql(
      `mutation C($m: MetaobjectCreateInput!) {
         metaobjectCreate(metaobject: $m) {
           metaobject { handle } userErrors { field message } } }`,
      {m: {type: 'ui_string', handle, fields}},
    );
    check(r.metaobjectCreate, `create ${handle}`);
    // Shopify silently suffixes a clashing handle rather than failing, which
    // would leave a duplicate the site never reads.
    const got = r.metaobjectCreate.metaobject.handle;
    if (got !== handle) throw new Error(`handle drift: asked ${handle}, got ${got}`);
    created++;
    continue;
  }

  // Only the organising fields are rewritten on an existing entry — the Text is
  // left exactly as the store owner has it, so a Spanish translation already
  // entered in Admin is never clobbered by the English fallback.
  const have = Object.fromEntries(found.fields.map((f) => [f.key, f.value]));
  const orgFields = fields.filter((f) => f.key !== 'value');
  if (orgFields.every((f) => have[f.key] === f.value)) {
    unchanged++;
    continue;
  }
  if (DRY) {
    console.log(`[dry-run] update ${handle}`);
    updated++;
    continue;
  }
  const r = await gql(
    `mutation U($id: ID!, $m: MetaobjectUpdateInput!) {
       metaobjectUpdate(id: $id, metaobject: $m) {
         metaobject { handle } userErrors { field message } } }`,
    {id: found.id, m: {fields: orgFields}},
  );
  check(r.metaobjectUpdate, `update ${handle}`);
  updated++;
}

console.log(
  `\nui_string — created ${created}, regrouped ${updated}, already fine ${unchanged} (${Object.keys(STRINGS).length} total)`,
);
