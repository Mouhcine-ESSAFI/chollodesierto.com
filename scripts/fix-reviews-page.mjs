/**
 * Two fixes for the /reviews archive:
 *
 *   1. Gives page_section `reviews.index` a subheading, so its header matches
 *      the homepage reviews section (heading + supporting line).
 *   2. Adds the `reviews` placement to the general traveler reviews that were
 *      only tagged `home`. The homepage's "Read all Reviews →" button pointed
 *      at a page showing fewer reviews than the homepage itself.
 *
 * Context-specific reviews (journey days, a camp tier, what's-included) are
 * deliberately left alone — they describe one part of the trip and would read
 * oddly in a general archive.
 *
 * Only fills blanks and only adds placements; never removes anything.
 *
 * Usage: node scripts/fix-reviews-page.mjs [--dry-run]
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

const UPDATE = `mutation U($id: ID!, $m: MetaobjectUpdateInput!) {
  metaobjectUpdate(id: $id, metaobject: $m) {
    metaobject { handle } userErrors { field message } } }`;

// 1. The archive header's supporting line.
const sections = await gql(
  `query { metaobjects(type: "page_section", first: 150) {
     nodes { id handle fields { key value } } } }`,
);
const reviewsSection = sections.metaobjects.nodes.find((n) => n.handle === 'reviews-index');
if (!reviewsSection) {
  console.log('skip: page_section/reviews-index not found');
} else {
  const have = Object.fromEntries(reviewsSection.fields.map((f) => [f.key, f.value]));
  if (have.subheading) {
    console.log(`keep  reviews.index subheading: ${JSON.stringify(have.subheading)}`);
  } else if (DRY) {
    console.log('[dry-run] would set reviews.index subheading');
  } else {
    const r = await gql(UPDATE, {
      id: reviewsSection.id,
      m: {
        fields: [
          {
            key: 'subheading',
            value: 'Every review below was left by someone who travelled with us.',
          },
        ],
      },
    });
    check(r.metaobjectUpdate, 'reviews.index');
    console.log('set   reviews.index subheading');
  }
}

// 2. General traveler reviews missing from the archive.
const ADD_REVIEWS_PLACEMENT = [
  'sofia-march-2025',
  'daniel-november-2024',
  'amelie-february-2025',
];

const reviews = await gql(
  `query { metaobjects(type: "review", first: 100) {
     nodes { id handle fields { key value } } } }`,
);

for (const n of reviews.metaobjects.nodes) {
  if (!ADD_REVIEWS_PLACEMENT.includes(n.handle)) continue;
  const raw = n.fields.find((f) => f.key === 'placement')?.value;
  let current = [];
  try {
    current = raw ? JSON.parse(raw) : [];
  } catch {
    current = [];
  }
  if (current.includes('reviews')) {
    console.log(`keep  review/${n.handle} (${current.join(',')})`);
    continue;
  }
  const next = [...current, 'reviews'];
  if (DRY) {
    console.log(`[dry-run] review/${n.handle}: ${current.join(',')} -> ${next.join(',')}`);
    continue;
  }
  const r = await gql(UPDATE, {
    id: n.id,
    m: {fields: [{key: 'placement', value: JSON.stringify(next)}]},
  });
  check(r.metaobjectUpdate, n.handle);
  console.log(`tag   review/${n.handle}: ${next.join(',')}`);
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
