/**
 * Replaces the placeholder "seed:…" alt text on store images with real
 * descriptions. Alt text is what a blind visitor hears and what Google reads,
 * so "seed:campfire" is a genuine content bug, not cosmetics.
 *
 * Needs the `write_files` scope. Only touches files whose alt starts with
 * "seed:" or is empty — anything already described by hand is left alone.
 *
 * Usage: node scripts/fix-image-alt-text.mjs [--dry-run]
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

/**
 * seed slug -> a real description of what the photo shows.
 * Matched against the existing alt text, so the mapping survives re-runs.
 */
const ALT = {
  'seed:campfire': 'Travellers gathered around a campfire at a Sahara desert camp',
  'seed:camp-comfort': 'A private Comfort tent at the desert camp, lit at dusk',
  'seed:camp-superior': 'The interior of a Superior suite tent with premium bedding',
  'seed:kasbah': 'The fortified kasbah of Ait Ben Haddou in golden light',
  'seed:quad': 'A quad bike on the dunes at Erg Chebbi',
  'seed:guide': 'A Berber guide leading camels through the dunes',
  'seed:camel-rider': 'A traveller riding a camel across the Sahara at sunrise',
  'seed:group': 'A small tour group posing together on a desert dune',
  'seed:erg-chebbi': 'The dunes of Erg Chebbi stretching to the horizon',
  'seed:atlas': 'A winding road through the High Atlas mountains',
  'seed:village': 'A kasbah village of earth-built houses beside palm groves',
  'seed:tour-group': 'A small tour group posing together on a desert dune',
  'seed:berber-guide': 'A Berber guide leading camels through the dunes',
  'seed:kasbah-village': 'A kasbah village of earth-built houses beside palm groves',
};

const files = await gql(`query { files(first: 250) {
  nodes { ... on MediaImage { id alt image { url } } } } }`);

const rows = files.files.nodes.filter((n) => n?.id);
console.log(`images in the store: ${rows.length}`);

const updates = [];
for (const n of rows) {
  const current = (n.alt ?? '').trim();
  if (current && !current.startsWith('seed:')) continue;

  let replacement = ALT[current];
  if (!replacement && current.startsWith('seed:')) {
    // Unknown seed slug — turn "seed:some-thing" into "Some thing" rather than
    // leaving the placeholder visible to screen readers.
    replacement =
      current.slice(5).replace(/[-_]/g, ' ').replace(/^./, (c) => c.toUpperCase()) +
      ' in the Moroccan desert';
  }
  if (!replacement) continue;

  updates.push({id: n.id, from: current || '(empty)', to: replacement});
}

if (!updates.length) {
  console.log('nothing to fix — no placeholder alt text left');
} else {
  for (const u of updates) console.log(`  ${u.from.padEnd(24)} -> ${u.to.slice(0, 58)}`);

  if (DRY) {
    console.log(`\n[dry-run] would update ${updates.length} image(s)`);
  } else {
    // fileUpdate takes a batch, so this is one call rather than one per image.
    const r = await gql(
      `mutation F($files: [FileUpdateInput!]!) {
         fileUpdate(files: $files) {
           files { ... on MediaImage { id alt } }
           userErrors { field message }
         } }`,
      {files: updates.map((u) => ({id: u.id, alt: u.to}))},
    );
    const errs = r.fileUpdate.userErrors;
    if (errs.length) throw new Error(JSON.stringify(errs));
    console.log(`\nupdated ${r.fileUpdate.files.length} image(s)`);

    const back = await gql(`query { files(first: 250) {
      nodes { ... on MediaImage { alt } } } }`);
    const left = back.files.nodes.filter((n) => (n?.alt ?? '').startsWith('seed:')).length;
    console.log(`verify — images still labelled "seed:…": ${left}`);
  }
}
