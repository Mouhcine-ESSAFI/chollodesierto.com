/**
 * Closes the last content gaps found by diffing what the site renders against
 * what Shopify holds:
 *
 *   - page_section `reviews.index`  — the /reviews page had no editable heading
 *   - page_section `about.values`   — the values block's eyebrow and heading
 *   - page_section `about.network`  — the partner-list intro
 *   - page_section `booking.hero`   — gains its heading and subheading
 *   - review placements             — the booking page and the homepage
 *     "why us" quote were rendering hardcoded English because no review was
 *     tagged for them
 *
 * Only fills blanks; never overwrites text already in Admin.
 *
 * Usage: node scripts/add-remaining-sections.mjs [--dry-run]
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
if (!STORE || !TOKEN) throw new Error('Set SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN in .env');

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
const check = (p, label) => {
  const e = p?.userErrors ?? [];
  if (e.length) throw new Error(`${label}: ${JSON.stringify(e)}`);
  return p;
};

// ── page_section entries ────────────────────────────────────────────────────

const SECTIONS = [
  {
    handle: 'reviews-index',
    fields: {
      key: 'reviews.index',
      heading: 'What travelers are saying',
      sort_order: '400',
    },
  },
  {
    handle: 'about-values',
    fields: {
      key: 'about.values',
      eyebrow: 'Our Values',
      heading: 'Four things we believe in.',
      sort_order: '410',
    },
  },
  {
    handle: 'about-network',
    fields: {
      key: 'about.network',
      eyebrow: 'Who we work with',
      heading: 'A network built on trust.',
      subheading:
        'Every partner we work with was chosen for quality, authenticity, and their deep roots in Moroccan culture.',
      sort_order: '420',
    },
  },
  {
    handle: 'booking-hero',
    fields: {
      key: 'booking.hero',
      heading: 'Book your adventure',
      subheading: "Five quick choices, and you're going. We'll handle the rest.",
    },
  },
];

const all = await gql(
  `query { metaobjects(type: "page_section", first: 150) {
     nodes { id handle fields { key value } } } }`,
);
const existing = new Map(all.metaobjects.nodes.map((n) => [n.handle, n]));

for (const s of SECTIONS) {
  const found = existing.get(s.handle);
  const fields = Object.entries(s.fields).map(([key, value]) => ({key, value}));

  if (!found) {
    if (DRY) {
      console.log(`[dry-run] create page_section/${s.handle}`);
      continue;
    }
    const r = await gql(
      `mutation C($m: MetaobjectCreateInput!) {
         metaobjectCreate(metaobject: $m) {
           metaobject { handle } userErrors { field message } } }`,
      {m: {type: 'page_section', handle: s.handle, fields}},
    );
    check(r.metaobjectCreate, `create ${s.handle}`);
    const got = r.metaobjectCreate.metaobject.handle;
    if (got !== s.handle) throw new Error(`handle drift: asked ${s.handle}, got ${got}`);
    console.log(`created  page_section/${got}`);
    continue;
  }

  const have = Object.fromEntries(found.fields.map((f) => [f.key, f.value]));
  const missing = fields.filter((f) => !have[f.key]);
  if (!missing.length) {
    console.log(`keep     page_section/${s.handle}`);
    continue;
  }
  if (DRY) {
    console.log(`[dry-run] fill ${s.handle}: ${missing.map((f) => f.key).join(', ')}`);
    continue;
  }
  const r = await gql(
    `mutation U($id: ID!, $m: MetaobjectUpdateInput!) {
       metaobjectUpdate(id: $id, metaobject: $m) {
         metaobject { handle } userErrors { field message } } }`,
    {id: found.id, m: {fields: missing}},
  );
  check(r.metaobjectUpdate, `update ${s.handle}`);
  console.log(`filled   page_section/${s.handle}: ${missing.map((f) => f.key).join(', ')}`);
}

// ── review placements ───────────────────────────────────────────────────────
// The booking page asks for placement "booking" and the homepage why-us block
// for "why_us". Nothing was tagged either way, so both fell back to hardcoded
// English. Add the tags without removing any existing placement.

const WANT_PLACEMENT = {
  'marcus-k-february-2025': ['booking'],
  'emma-january-2025': ['booking'],
  'johan-r-october-2024': ['booking'],
  'sofia-march-2025': ['booking'],
  'daniel-november-2024': ['why_us'],
};

const reviews = await gql(
  `query { metaobjects(type: "review", first: 100) {
     nodes { id handle fields { key value } } } }`,
);

for (const n of reviews.metaobjects.nodes) {
  const want = WANT_PLACEMENT[n.handle];
  if (!want) continue;
  const raw = n.fields.find((f) => f.key === 'placement')?.value;
  let current = [];
  try {
    current = raw ? JSON.parse(raw) : [];
  } catch {
    current = [];
  }
  const missing = want.filter((w) => !current.includes(w));
  if (!missing.length) {
    console.log(`keep     review/${n.handle} (${current.join(',')})`);
    continue;
  }
  const next = [...current, ...missing];
  if (DRY) {
    console.log(`[dry-run] review/${n.handle}: ${current.join(',')} -> ${next.join(',')}`);
    continue;
  }
  const r = await gql(
    `mutation U($id: ID!, $m: MetaobjectUpdateInput!) {
       metaobjectUpdate(id: $id, metaobject: $m) {
         metaobject { handle } userErrors { field message } } }`,
    {id: n.id, m: {fields: [{key: 'placement', value: JSON.stringify(next)}]}},
  );
  check(r.metaobjectUpdate, `review ${n.handle}`);
  console.log(`tagged   review/${n.handle}: ${next.join(',')}`);
}

if (!DRY) {
  const back = await gql(
    `query { metaobjects(type: "review", first: 100) {
       nodes { handle fields { key value } } } }`,
  );
  const counts = {};
  for (const n of back.metaobjects.nodes) {
    const raw = n.fields.find((f) => f.key === 'placement')?.value;
    for (const p of raw ? JSON.parse(raw) : []) counts[p] = (counts[p] ?? 0) + 1;
  }
  console.log('\nplacement counts:', JSON.stringify(counts));
}
