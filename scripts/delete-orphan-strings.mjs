/**
 * Deletes ui_string entries that no longer exist in the code, so a translator
 * never spends time on text the site cannot show.
 *
 * Pass the handles to remove as arguments. Refuses to delete a handle whose key
 * is still referenced anywhere under app/, so a mistyped argument can't take out
 * a live string.
 *
 * Usage: node scripts/delete-orphan-strings.mjs s-blog-read-more [--dry-run]
 */
import {readdirSync, readFileSync, statSync} from 'fs';
import {join} from 'path';

const DRY = process.argv.includes('--dry-run');
const handles = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!handles.length) throw new Error('give at least one ui_string handle to delete');

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

function walk(dir) {
  const out = [];
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}
const sources = walk('app').map((f) => readFileSync(f, 'utf8'));

for (const handle of handles) {
  const found = await gql(
    `query H($h: MetaobjectHandleInput!) {
       metaobjectByHandle(handle: $h) { id fields { key value } } }`,
    {h: {type: 'ui_string', handle}},
  );
  const node = found.metaobjectByHandle;
  if (!node) {
    console.log(`skip ${handle}: not in Shopify`);
    continue;
  }
  const key = node.fields.find((f) => f.key === 'key')?.value ?? '';

  // Safety: never delete something the code still asks for.
  if (key && sources.some((s) => s.includes(`'${key}'`))) {
    console.log(`REFUSE ${handle}: key "${key}" is still referenced in app/`);
    continue;
  }

  if (DRY) {
    console.log(`[dry-run] would delete ${handle} (key "${key}")`);
    continue;
  }
  const r = await gql(
    `mutation D($id: ID!) { metaobjectDelete(id: $id) {
       deletedId userErrors { field message } } }`,
    {id: node.id},
  );
  const errs = r.metaobjectDelete.userErrors;
  if (errs.length) throw new Error(`${handle}: ${JSON.stringify(errs)}`);
  console.log(`deleted ${handle} (key "${key}")`);
}
