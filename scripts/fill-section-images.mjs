/**
 * Fills the page_section image slots the About page reads but that were left
 * empty, so those photos come from Shopify instead of the hardcoded Unsplash
 * fallbacks baked into the components.
 *
 * Only ever writes an EMPTY field — a photo the store owner has already chosen
 * is never replaced. Re-runnable.
 *
 * The store has no write_files scope, so this reuses the MediaImages already in
 * the library rather than uploading new ones. Swap any of them in Admin:
 * Content › Metaobjects › Page Section.
 *
 * Usage: node scripts/fill-section-images.mjs [--dry-run]
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

// The MediaImages already in this store, named by what they show. Read back
// from the metaobjects that reference them so the script stays truthful even
// if the library is re-seeded.
const SOURCE_FIELDS = [
  ['camp_tier', 'image'],
  ['gallery_item', 'image'],
  ['tour_route', 'image'],
];

const library = [];
for (const [type, key] of SOURCE_FIELDS) {
  const d = await gql(
    `query T($t: String!) { metaobjects(type: $t, first: 50) {
       nodes { handle fields { key value } } } }`,
    {t: type},
  );
  for (const n of d.metaobjects.nodes) {
    const gid = n.fields.find((f) => f.key === key)?.value;
    if (gid && !library.some((l) => l.gid === gid)) library.push({gid, from: n.handle});
  }
}
if (!library.length) throw new Error('no MediaImages found to reuse');
console.log(`media library: ${library.length} images`);

const pick = (i) => library[i % library.length].gid;

// section key -> {field: value}. `images` is a list field, so a JSON array.
const WANTED = {
  'about.hero': {image: pick(3)},
  'about.story': {images: JSON.stringify([pick(0), pick(4), pick(5)])},
  'about.partners': {
    images: JSON.stringify([pick(1), pick(2), pick(6), pick(7), pick(8), pick(0)]),
  },
  'about.supports': {image: pick(2)},
};

const all = await gql(
  `query { metaobjects(type: "page_section", first: 100) {
     nodes { id handle fields { key value } } } }`,
);
const byKey = new Map();
for (const n of all.metaobjects.nodes) {
  const key = n.fields.find((f) => f.key === 'key')?.value;
  if (key) byKey.set(key, n);
}

let wrote = 0;
let kept = 0;
for (const [key, want] of Object.entries(WANTED)) {
  const node = byKey.get(key);
  if (!node) {
    console.log(`skip ${key}: no such page_section`);
    continue;
  }
  const have = Object.fromEntries(node.fields.map((f) => [f.key, f.value]));
  // Never overwrite a choice the store owner already made.
  const fields = Object.entries(want)
    .filter(([f]) => !have[f])
    .map(([f, value]) => ({key: f, value}));
  if (!fields.length) {
    console.log(`keep ${key}: already set`);
    kept++;
    continue;
  }
  if (DRY) {
    console.log(`[dry-run] ${key}: would set ${fields.map((f) => f.key).join(', ')}`);
    wrote++;
    continue;
  }
  const r = await gql(
    `mutation U($id: ID!, $m: MetaobjectUpdateInput!) {
       metaobjectUpdate(id: $id, metaobject: $m) {
         metaobject { handle } userErrors { field message } } }`,
    {id: node.id, m: {fields}},
  );
  const errs = r.metaobjectUpdate.userErrors;
  if (errs.length) throw new Error(`${key}: ${JSON.stringify(errs)}`);
  console.log(`set  ${key}: ${fields.map((f) => f.key).join(', ')}`);
  wrote++;
}

console.log(`\n${wrote} section(s) filled, ${kept} left as they were`);
