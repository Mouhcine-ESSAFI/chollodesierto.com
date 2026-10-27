/**
 * Backs the shared page hero (PageHero) with editable content on the three
 * pages that had none.
 *
 * /booking and /blog already had their own `page_section` with an image.
 * /contact had a heading but no subheading and no image, and /faq and /reviews
 * had no hero entry at all — so the hero would have rendered with the code
 * fallbacks and no photo.
 *
 * The photo defaults to whatever booking.hero is using, so all five heroes
 * open on the same image until someone picks a different one per page in
 * Admin > Content > Metaobjects > Page Section.
 *
 * Idempotent: an entry that exists keeps every value it already has; only
 * blank fields are filled.
 *
 * Usage: node scripts/add-page-heroes.mjs [--dry-run]
 */
import {readFileSync} from 'fs';

const DRY = process.argv.includes('--dry-run');

const env = {};
for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const STORE = env.SHOPIFY_STORE_DOMAIN || env.PUBLIC_STORE_DOMAIN;
const TOKEN = env.SHOPIFY_ADMIN_ACCESS_TOKEN || env.PRIVATE_ADMIN_API_TOKEN;
if (!STORE || !TOKEN) {
  throw new Error('Set SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN in .env');
}

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

const SECTIONS_QUERY = `query {
  metaobjects(type: "page_section", first: 100) {
    nodes { id handle fields { key value } }
  }
}`;

const all = await gql(SECTIONS_QUERY);
const existing = new Map(all.metaobjects.nodes.map((n) => [n.handle, n]));
const valueOf = (handle, key) =>
  existing.get(handle)?.fields.find((f) => f.key === key)?.value ?? '';

// Every new hero borrows the booking hero's photo. Without it there is nothing
// to point the file_reference at, and the heroes would render as flat sand.
const heroImage = valueOf('booking-hero', 'image');
if (!heroImage) {
  throw new Error('booking-hero has no image — set one in Admin first.');
}
console.log(`hero image: ${heroImage}\n`);

const ENTRIES = [
  {
    handle: 'faq-hero',
    fields: {
      key: 'faq.hero',
      heading: 'Everything you asked.',
      subheading: 'The questions travelers send us most, answered in plain words.',
      image: heroImage,
      sort_order: '340',
    },
  },
  {
    handle: 'reviews-hero',
    fields: {
      key: 'reviews.hero',
      heading: 'Straight from the camp.',
      subheading: 'Unfiltered words from people who actually made the trip.',
      image: heroImage,
      sort_order: '390',
    },
  },
  {
    // Exists already — this only fills the two fields the hero added.
    handle: 'contact-hero',
    fields: {
      key: 'contact.hero',
      heading: 'Get in touch.',
      subheading:
        'Questions before you book? We answer every message — usually within the hour.',
      image: heroImage,
      sort_order: '300',
    },
  },
];

let created = 0;
let filled = 0;
let kept = 0;

for (const e of ENTRIES) {
  const found = existing.get(e.handle);
  const fields = Object.entries(e.fields).map(([key, value]) => ({key, value}));

  if (!found) {
    if (DRY) {
      console.log(`[dry-run] create page_section/${e.handle}`);
      created++;
      continue;
    }
    const r = await gql(
      `mutation C($m: MetaobjectCreateInput!) {
         metaobjectCreate(metaobject: $m) {
           metaobject { handle } userErrors { field message } } }`,
      {m: {type: 'page_section', handle: e.handle, fields}},
    );
    const errs = r.metaobjectCreate.userErrors;
    if (errs.length) throw new Error(`create ${e.handle}: ${JSON.stringify(errs)}`);
    // Shopify silently suffixes a clashing handle instead of failing, which
    // would leave an entry the site never reads.
    const got = r.metaobjectCreate.metaobject.handle;
    if (got !== e.handle) throw new Error(`handle drift: asked ${e.handle}, got ${got}`);
    console.log(`created  page_section/${got}`);
    created++;
    continue;
  }

  // Fill only what's blank, so edits made in Admin survive a re-run.
  const have = Object.fromEntries(found.fields.map((f) => [f.key, f.value]));
  const missing = fields.filter((f) => !have[f.key]);
  if (!missing.length) {
    console.log(`keep     page_section/${e.handle} (all set)`);
    kept++;
    continue;
  }
  if (DRY) {
    console.log(`[dry-run] fill ${e.handle}: ${missing.map((f) => f.key).join(', ')}`);
    filled++;
    continue;
  }
  const r = await gql(
    `mutation U($id: ID!, $m: MetaobjectUpdateInput!) {
       metaobjectUpdate(id: $id, metaobject: $m) {
         metaobject { handle } userErrors { field message } } }`,
    {id: found.id, m: {fields: missing}},
  );
  const errs = r.metaobjectUpdate.userErrors;
  if (errs.length) throw new Error(`update ${e.handle}: ${JSON.stringify(errs)}`);
  console.log(`filled   page_section/${e.handle}: ${missing.map((f) => f.key).join(', ')}`);
  filled++;
}

console.log(`\ncreated ${created}, filled ${filled}, unchanged ${kept}`);

if (!DRY) {
  const back = await gql(SECTIONS_QUERY);
  const wanted = new Set([...ENTRIES.map((e) => e.handle), 'booking-hero', 'blog-index']);
  for (const n of back.metaobjects.nodes.filter((x) => wanted.has(x.handle))) {
    const img = n.fields.find((f) => f.key === 'image')?.value || 'NO IMAGE';
    const head = n.fields.find((f) => f.key === 'heading')?.value || '—';
    const sub = n.fields.find((f) => f.key === 'subheading')?.value || '—';
    console.log(`verify ${n.handle.padEnd(14)} ${img.padEnd(42)} ${head} / ${sub.slice(0, 40)}`);
  }
}
