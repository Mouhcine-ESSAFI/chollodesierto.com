/**
 * Adds the page_section entries for the journal (blog) listing, the single post
 * page, and the contact page — the three pages that had no editable section
 * copy of their own.
 *
 * Articles themselves stay in Shopify's own Blog posts; these entries are the
 * surrounding chrome (eyebrow, heading, intro, empty state, button labels) so a
 * non-developer can reword those pages without touching code.
 *
 * Idempotent: an entry that exists keeps every value it already has; only
 * blank fields are filled.
 *
 * Usage: node scripts/add-blog-contact-sections.mjs [--dry-run]
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

const ENTRIES = [
  {
    handle: 'blog-index',
    fields: {
      key: 'blog.index',
      eyebrow: 'Journal',
      heading: 'Notes from the desert.',
      subheading: 'Route notes, packing advice and stories from our guides.',
      body:
        "We're writing up route notes and traveler stories. Check back soon, or get in touch if there's something you'd like us to cover.",
      label_primary: 'Read more',
      sort_order: '200',
    },
  },
  {
    handle: 'blog-post',
    fields: {
      key: 'blog.post',
      label_secondary: 'Journal',
      heading: 'Ready to see it yourself?',
      label_primary: 'Book your adventure',
      sort_order: '210',
    },
  },
  {
    handle: 'contact-hero',
    fields: {
      key: 'contact.hero',
      eyebrow: 'Contact',
      heading: 'Get in touch.',
      sort_order: '300',
    },
  },
  {
    handle: 'contact-whatsapp',
    fields: {
      key: 'contact.whatsapp',
      heading: 'Chat with us',
      body: "WhatsApp us if you'd rather talk first — we usually answer within an hour.",
      label_primary: 'Chat on WhatsApp',
      sort_order: '310',
    },
  },
  {
    handle: 'contact-social',
    fields: {
      key: 'contact.social',
      heading: 'Find us',
      sort_order: '320',
    },
  },
  {
    handle: 'contact-form',
    fields: {
      key: 'contact.form',
      heading: 'Send a message',
      body: 'Prefer email? Use the form — or message us on WhatsApp for a faster reply.',
      label_primary: 'Send message',
      sort_order: '330',
    },
  },
];

const all = await gql(
  `query { metaobjects(type: "page_section", first: 100) {
     nodes { id handle fields { key value } } } }`,
);
const existing = new Map(all.metaobjects.nodes.map((n) => [n.handle, n]));

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
  const back = await gql(
    `query { metaobjects(type: "page_section", first: 100) {
       nodes { handle fields { key value } } } }`,
  );
  const wanted = new Set(ENTRIES.map((e) => e.handle));
  for (const n of back.metaobjects.nodes.filter((n) => wanted.has(n.handle))) {
    const set = n.fields.filter((f) => f.value).map((f) => f.key);
    console.log(`verify ${n.handle.padEnd(18)} ${set.join(', ')}`);
  }
}
