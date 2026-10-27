/**
 * Gives each itinerary day its own icon, editable in Admin.
 *
 * The homepage showed the same face beside "What you'll see today" on all
 * three days. The character is now a field on journey_day, with a spoken
 * label beside it so screen readers announce something meaningful rather
 * than the emoji's generic name.
 *
 * Only fills blanks — an icon already chosen in Admin is left alone.
 *
 * Usage: node scripts/add-journey-day-emoji.mjs [--dry-run]
 */
import {readFileSync} from 'fs';

const DRY = process.argv.includes('--dry-run');

const env = {};
for (const l of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const STORE = env.SHOPIFY_STORE_DOMAIN || env.PUBLIC_STORE_DOMAIN;
const TOKEN = env.SHOPIFY_ADMIN_ACCESS_TOKEN;
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
const check = (p, l) => {
  const e = p?.userErrors ?? [];
  if (e.length) throw new Error(`${l}: ${JSON.stringify(e)}`);
  return p;
};

// Chosen to match what each day is actually about.
const ICONS = {
  1: {emoji: '\u{1F3D4}\u{FE0F}', emoji_label: 'Snow-capped mountain'}, // High Atlas crossing
  2: {emoji: '\u{1F42A}',          emoji_label: 'Camel'},               // camel trek into Erg Chebbi
  3: {emoji: '\u{1F54C}',          emoji_label: 'Mosque'},              // the medina of Fes
};

// 1. Definition fields.
const def = (
  await gql(`query { metaobjectDefinitionByType(type: "journey_day") {
    id fieldDefinitions { key } } }`)
).metaobjectDefinitionByType;
const have = new Set(def.fieldDefinitions.map((f) => f.key));

const create = [];
if (!have.has('emoji')) {
  create.push({create: {key: 'emoji', name: 'Icon', type: 'single_line_text_field',
    description: 'One emoji shown beside "What you’ll see today" for this day.', required: false}});
}
if (!have.has('emoji_label')) {
  create.push({create: {key: 'emoji_label', name: 'Icon description', type: 'single_line_text_field',
    description: 'What the icon shows, read aloud to blind visitors. E.g. "Camel".', required: false}});
}
if (create.length) {
  if (DRY) console.log(`[dry-run] would add ${create.length} field(s) to journey_day`);
  else {
    const r = await gql(`mutation U($id: ID!, $d: MetaobjectDefinitionUpdateInput!) {
      metaobjectDefinitionUpdate(id:$id, definition:$d) {
        metaobjectDefinition { fieldDefinitions { key } } userErrors { field message } } }`,
      {id: def.id, d: {fieldDefinitions: create}});
    check(r.metaobjectDefinitionUpdate, 'journey_day fields');
    console.log(`added ${create.length} field(s) to journey_day`);
  }
} else console.log('journey_day already has emoji fields');

// 2. Values per day.
const days = (await gql(`query { metaobjects(type: "journey_day", first: 50) {
  nodes { id handle fields { key value } } } }`)).metaobjects.nodes;

for (const n of days) {
  const f = Object.fromEntries(n.fields.map((x) => [x.key, x.value]));
  const want = ICONS[Number(f.day_number)];
  if (!want) { console.log(`skip ${n.handle}: no icon planned for day ${f.day_number}`); continue; }

  const fields = Object.entries(want)
    .filter(([k]) => !f[k])
    .map(([key, value]) => ({key, value}));
  if (!fields.length) { console.log(`keep ${n.handle}: already set (${f.emoji})`); continue; }

  if (DRY) { console.log(`[dry-run] day ${f.day_number} → ${want.emoji} (${want.emoji_label})`); continue; }
  const r = await gql(`mutation U($id: ID!, $m: MetaobjectUpdateInput!) {
    metaobjectUpdate(id:$id, metaobject:$m){ metaobject { handle } userErrors { field message } } }`,
    {id: n.id, m: {fields}});
  check(r.metaobjectUpdate, n.handle);
  console.log(`set  day ${f.day_number}  ${want.emoji}  "${want.emoji_label}"`);
}

if (!DRY) {
  const back = (await gql(`query { metaobjects(type: "journey_day", first: 50) {
    nodes { fields { key value } } } }`)).metaobjects.nodes;
  console.log('\nverify:');
  for (const n of back) {
    const f = Object.fromEntries(n.fields.map((x) => [x.key, x.value]));
    console.log(`  day ${f.day_number}  ${f.emoji ?? '(none)'}  "${f.emoji_label ?? ''}"  — ${f.title}`);
  }
}
