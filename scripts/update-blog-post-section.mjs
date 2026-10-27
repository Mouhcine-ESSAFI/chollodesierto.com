/**
 * Repoints page_section `blog.post` at the new post-page design.
 *
 * The old layout ended with a single booking button, so the section held a CTA
 * heading ("Ready to see it yourself?") and a button label. The new layout ends
 * with the "From the Sahara" recent-stories block instead, so the same fields
 * now carry that block's eyebrow, heading, intro and link label.
 *
 * This OVERWRITES those three values, unlike the other scripts, because the old
 * wording belongs to a section that no longer exists. `label_secondary` (the
 * back link) keeps its meaning and is left alone. Run with --dry-run first.
 *
 * Usage: node scripts/update-blog-post-section.mjs [--dry-run]
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

// Values the old CTA layout left behind. Only these are replaced — anything
// else means the owner has edited the section, and it is kept.
const STALE = {
  heading: 'Ready to see it yourself?',
  label_primary: 'Book your adventure',
};

const WANTED = {
  eyebrow: 'Recent Stories',
  heading: 'From the Sahara',
  subheading:
    'Guides, tips, and tales from the Sahara written by people who actually live here.',
  label_primary: 'See All Stories',
};

const found = await gql(
  `query H($h: MetaobjectHandleInput!) {
     metaobjectByHandle(handle: $h) { id fields { key value } } }`,
  {h: {type: 'page_section', handle: 'blog-post'}},
);
const node = found.metaobjectByHandle;
if (!node) throw new Error('page_section/blog-post not found');

const have = Object.fromEntries(node.fields.map((f) => [f.key, f.value]));

const fields = [];
for (const [key, value] of Object.entries(WANTED)) {
  const current = have[key];
  if (!current) {
    fields.push({key, value});
    console.log(`fill    ${key} -> ${JSON.stringify(value.slice(0, 48))}`);
  } else if (STALE[key] && current === STALE[key]) {
    fields.push({key, value});
    console.log(`replace ${key}: ${JSON.stringify(current)} -> ${JSON.stringify(value.slice(0, 48))}`);
  } else {
    console.log(`keep    ${key}: ${JSON.stringify(String(current).slice(0, 48))} (edited in Admin)`);
  }
}

if (!fields.length) {
  console.log('\nnothing to change');
} else if (DRY) {
  console.log(`\n[dry-run] would write ${fields.length} field(s)`);
} else {
  const r = await gql(
    `mutation U($id: ID!, $m: MetaobjectUpdateInput!) {
       metaobjectUpdate(id: $id, metaobject: $m) {
         metaobject { handle } userErrors { field message } } }`,
    {id: node.id, m: {fields}},
  );
  const errs = r.metaobjectUpdate.userErrors;
  if (errs.length) throw new Error(JSON.stringify(errs));
  console.log(`\nwrote ${fields.length} field(s)`);

  const back = await gql(
    `query H($h: MetaobjectHandleInput!) {
       metaobjectByHandle(handle: $h) { fields { key value } } }`,
    {h: {type: 'page_section', handle: 'blog-post'}},
  );
  console.log('\nblog.post now:');
  for (const f of back.metaobjectByHandle.fields) {
    if (f.value) console.log(`  ${f.key.padEnd(16)} ${JSON.stringify(f.value.slice(0, 60))}`);
  }
}
