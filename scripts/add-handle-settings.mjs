/**
 * Moves the last four store-specific handles out of source and into
 * site_settings, so a second store can use a different catalogue without a
 * code change:
 *
 *   tour_product_handle      the product all routes sell through
 *   quad_product_handle      the quad-bike add-on
 *   transfer_product_handle  the airport transfer add-on
 *   journey_route_handle     which tour_route the day-by-day itinerary belongs to
 *
 * These are configuration, not content: they stay in English on every store,
 * like every other key and handle. Only the text a visitor reads is translated.
 *
 * Each value is checked against the target store before it is written — a
 * handle that resolves to nothing silently empties a whole section, which is
 * the failure mode that cost us the Journey section once already.
 *
 * Idempotent: a field that exists is left alone, a value already set is kept.
 *
 * Usage: node scripts/add-handle-settings.mjs [--dry-run]
 */
import {resolveStore} from './store-env.mjs';

const DRY = process.argv.includes('--dry-run');

// Acts on the NEW_* store when that pair is set, so a clone can be driven
// from this repo without editing .env.
const {domain: STORE, token: TOKEN} = resolveStore({preferNew: true});

async function admin(query, variables) {
  const r = await fetch(`https://${STORE}/admin/api/2025-01/graphql.json`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN},
    body: JSON.stringify({query, variables}),
  });
  const j = await r.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors));
  return j.data;
}

const FIELDS = [
  {
    key: 'tour_product_handle',
    name: 'Tour product handle',
    description:
      'The product every route sells through. Find it in the product URL: /products/<handle>. Changing this repoints the whole booking form.',
    value: '3-day-sahara-tour',
    kind: 'product',
  },
  {
    key: 'quad_product_handle',
    name: 'Quad add-on product handle',
    description: 'The quad-bike add-on sold in step 5 of the booking form.',
    value: 'quad-bike-rental',
    kind: 'product',
  },
  {
    key: 'transfer_product_handle',
    name: 'Airport transfer product handle',
    description: 'The airport transfer add-on offered in the booking form.',
    value: 'airport-transfer',
    kind: 'product',
  },
  {
    key: 'journey_route_handle',
    name: 'Itinerary route handle',
    description:
      'Which tour route the day-by-day itinerary on the homepage describes. Must match a Tour Route entry handle.',
    value: 'grand-crossing',
    kind: 'tour_route',
  },
];

// ── Check every value resolves before writing any of them ───────────────────
const productHandles = FIELDS.filter((f) => f.kind === 'product').map((f) => f.value);
const found = await admin(
  `query($q: String!) { products(first: 50, query: $q) { nodes { handle } } }`,
  {q: productHandles.map((h) => `handle:${h}`).join(' OR ')},
);
const haveProducts = new Set(found.products.nodes.map((n) => n.handle));

const routes = await admin(
  `query { metaobjects(type: "tour_route", first: 50) { nodes { handle } } }`,
);
const haveRoutes = new Set(routes.metaobjects.nodes.map((n) => n.handle));

let broken = 0;
for (const f of FIELDS) {
  const ok = f.kind === 'product' ? haveProducts.has(f.value) : haveRoutes.has(f.value);
  if (!ok) broken++;
  console.log(`  ${ok ? 'OK  ' : 'MISS'} ${f.key.padEnd(24)} ${f.kind}/${f.value}`);
}
if (broken) {
  throw new Error(
    `${broken} handle(s) do not resolve on ${STORE} — fix the value before writing it.`,
  );
}
console.log('');

// ── Definition ──────────────────────────────────────────────────────────────
const def = (
  await admin(`query { metaobjectDefinitionByType(type: "site_settings") {
    id fieldDefinitions { key } } }`)
).metaobjectDefinitionByType;
const haveFields = new Set(def.fieldDefinitions.map((f) => f.key));
const toCreate = FIELDS.filter((f) => !haveFields.has(f.key));

if (!toCreate.length) {
  console.log('all four fields already on the site_settings definition');
} else if (DRY) {
  console.log(`[dry-run] would add: ${toCreate.map((f) => f.key).join(', ')}`);
} else {
  const r = await admin(
    `mutation U($id: ID!, $d: MetaobjectDefinitionUpdateInput!) {
       metaobjectDefinitionUpdate(id: $id, definition: $d) {
         userErrors { field message } } }`,
    {
      id: def.id,
      d: {
        fieldDefinitions: toCreate.map((f) => ({
          create: {
            key: f.key,
            name: f.name,
            type: 'single_line_text_field',
            description: f.description,
            required: false,
          },
        })),
      },
    },
  );
  const errs = r.metaobjectDefinitionUpdate.userErrors;
  if (errs.length) throw new Error(JSON.stringify(errs));
  console.log(`added to definition: ${toCreate.map((f) => f.key).join(', ')}`);
}

// ── Entry values ────────────────────────────────────────────────────────────
const entry = (
  await admin(`query { metaobjects(type: "site_settings", first: 1) {
    nodes { id fields { key value } } } }`)
).metaobjects.nodes[0];
if (!entry) throw new Error('no site_settings entry on this store');

const have = Object.fromEntries(entry.fields.map((f) => [f.key, f.value]));
const toSet = FIELDS.filter((f) => !have[f.key]).map((f) => ({key: f.key, value: f.value}));

if (!toSet.length) {
  console.log('all four values already set — left alone');
} else if (DRY) {
  console.log(`[dry-run] would set: ${toSet.map((f) => `${f.key}=${f.value}`).join(', ')}`);
} else {
  const r = await admin(
    `mutation U($id: ID!, $m: MetaobjectUpdateInput!) {
       metaobjectUpdate(id: $id, metaobject: $m) { userErrors { field message } } }`,
    {id: entry.id, m: {fields: toSet}},
  );
  const errs = r.metaobjectUpdate.userErrors;
  if (errs.length) throw new Error(JSON.stringify(errs));
  console.log(`set: ${toSet.map((f) => `${f.key}=${f.value}`).join(', ')}`);
}
