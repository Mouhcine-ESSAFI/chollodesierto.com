/**
 * Verifies the ui_string metaobjects match what the code asks for.
 *
 * Reports:
 *   MISSING   a t() key with no entry in Shopify — the site falls back to the
 *             hardcoded English, and a translator can never reach it.
 *   ORPHAN    an entry no code reads — editing it does nothing.
 *   UNGROUPED an entry with no Label or Where-it-appears, so it is hard to find.
 *
 * A Text that differs from the code fallback is NOT an error: that is what a
 * Spanish store looks like.
 *
 * Usage: node scripts/check-ui-strings.mjs
 * Exits 1 if anything is MISSING or ORPHAN.
 */
import {readdirSync, readFileSync, statSync} from 'fs';
import {resolveStore} from './store-env.mjs';
import {join} from 'path';

// Acts on the NEW_* store when that pair is set, so a clone can be driven
// from this repo without editing .env.
const {domain: STORE, token: TOKEN} = resolveStore({preferNew: true});

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
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}

// t('key', <fallback>) — the fallback is usually a string literal but may be
// an expression (a value already read from Shopify), so don't require a quote.
const DIRECT = /\bt\(\s*'([^']+)'\s*,/g;

// Some keys are declared as [key, english] tuples and fed to t() in a loop —
// the calendar's day and month names, for example. Without this they'd look
// unused and get reported as orphans.
const TUPLE = /\[\s*'([a-z][a-z0-9_]*(?:\.[a-z0-9_]+)+)'\s*,\s*'(?:[^'\\]|\\.)*'\s*\]/g;

const inCode = new Map();
for (const file of walk('app')) {
  const src = readFileSync(file, 'utf8');
  for (const re of [DIRECT, TUPLE]) {
    for (const m of src.matchAll(re)) {
      inCode.set(m[1], file.replace(/\\/g, '/'));
    }
  }
}

const inShopify = new Map();
let cursor = null;
do {
  const page = await gql(
    `query P($after: String) { metaobjects(type: "ui_string", first: 250, after: $after) {
       nodes { handle fields { key value } }
       pageInfo { hasNextPage endCursor } } }`,
    {after: cursor},
  );
  for (const n of page.metaobjects.nodes) {
    const f = Object.fromEntries(n.fields.map((x) => [x.key, x.value]));
    if (f.key) inShopify.set(f.key, {...f, handle: n.handle});
  }
  cursor = page.metaobjects.pageInfo.hasNextPage ? page.metaobjects.pageInfo.endCursor : null;
} while (cursor);

const missing = [...inCode.keys()].filter((k) => !inShopify.has(k)).sort();
const orphan = [...inShopify.keys()].filter((k) => !inCode.has(k)).sort();
const ungrouped = [...inShopify.entries()]
  .filter(([k, f]) => inCode.has(k) && (!f.label || !f.group))
  .map(([k]) => k)
  .sort();

console.log(`code: ${inCode.size} keys · Shopify: ${inShopify.size} entries`);
for (const k of missing) console.log(`MISSING   ${k}  (${inCode.get(k)})`);
for (const k of orphan) console.log(`ORPHAN    ${k}  (${inShopify.get(k).handle})`);
for (const k of ungrouped) console.log(`UNGROUPED ${k}`);

if (!missing.length && !orphan.length && !ungrouped.length) console.log('all in sync');
// exitCode rather than exit(): process.exit() races libuv teardown on Windows.
process.exitCode = missing.length || orphan.length ? 1 : 0;
