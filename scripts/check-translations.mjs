/**
 * Reports which content on a store is still English.
 *
 * Why this exists: every t() call in the code carries an English default, and
 * most components carry English fallback data. So a field nobody translated —
 * or nobody filled in at all — renders as perfectly good English with no error
 * anywhere. On a Spanish store that stays invisible until a customer sees it.
 * Journey.tsx proves the point: its hardcoded fallback days carry the exact
 * same titles as the Shopify entries, so the section looks identical whether
 * the data loaded or not.
 *
 *   node scripts/check-translations.mjs --export   # snapshot the English store
 *   node scripts/check-translations.mjs            # report on the target store
 *   node scripts/check-translations.mjs --all      # every finding, not a sample
 *
 * --export reads SHOPIFY_STORE_DOMAIN (the English store) and writes
 * data/en-baseline.json. The report reads NEW_STORE_DOMAIN /
 * NEW_ADMIN_ACCESS_TOKEN when those are set, otherwise SHOPIFY_STORE_DOMAIN.
 *
 * Only visible text is checked. Keys, handles, sort orders, labels, notes,
 * groups, URLs and image references are configuration: they stay English on
 * every store, so they are skipped.
 */
import {readFileSync, writeFileSync, existsSync, mkdirSync} from 'fs';
import {resolveStore} from './store-env.mjs';

const EXPORT = process.argv.includes('--export');
const SHOW_ALL = process.argv.includes('--all');
const BASELINE = 'data/en-baseline.json';

// --export always snapshots the English source; the report reads the target.
const {domain: STORE, token: TOKEN} = resolveStore({preferNew: !EXPORT});

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
 * Shopify caps metaobjects at 250 per page. ui_string is already past that, and
 * an unpaginated read drops the newest entries silently — they then look like
 * they were never created.
 */
async function allEntries(type) {
  const out = [];
  let after = null;
  do {
    const d = await gql(
      `query($after: String) {
         metaobjects(type: "${type}", first: 250, after: $after) {
           nodes { handle fields { key value } }
           pageInfo { hasNextPage endCursor }
         }
       }`,
      {after},
    );
    out.push(...d.metaobjects.nodes);
    after = d.metaobjects.pageInfo.hasNextPage ? d.metaobjects.pageInfo.endCursor : null;
  } while (after);
  return out;
}

/**
 * Configuration, not content. These hold the same value on every store by
 * design, so flagging them as "untranslated" would bury the real findings.
 */
const SKIP_EXACT = new Set([
  'key', 'handle', 'group', 'note', 'label', 'sort_order', 'placement',
  'image', 'images', 'icon', 'emoji', 'flag', 'rating', 'price', 'number',
  'route', 'camp', 'product', 'variant', 'tour_type', 'blog_handle',
  'brand_name', 'instagram_handle', 'deposit_percent', 'max_group_size',
  'free_cancellation_hours', 'rating_value', 'travelers_hosted', 'video_url',
]);
const SKIP_SUFFIX = ['_url', '_handle', '_order', '_percent', '_hours', '_id', '_gid'];

/**
 * A value that is a bare number, a boolean, a date or a gid is data, not prose
 * — "3" and "false" are the same in every language, so counting them as
 * untranslated only inflates the number a translator has to work through.
 */
const isNonText = (value) =>
  /^(true|false)$/i.test(value) ||
  /^-?\d+([.,]\d+)?$/.test(value) ||
  /^gid:\/\//.test(value) ||
  /^\d{4}-\d{2}-\d{2}/.test(value) ||
  /^\[.*\]$/s.test(value.trim());

const isConfig = (key, value) =>
  SKIP_EXACT.has(key) ||
  SKIP_SUFFIX.some((s) => key.endsWith(s)) ||
  isNonText(value);

async function snapshot() {
  const types = (
    await gql(`query { metaobjectDefinitions(first: 50) { nodes { type } } }`)
  ).metaobjectDefinitions.nodes.map((n) => n.type);

  const data = {};
  for (const type of types) {
    data[type] = {};
    for (const node of await allEntries(type)) {
      const fields = {};
      for (const f of node.fields) {
        if (f.value && !isConfig(f.key, f.value)) fields[f.key] = f.value;
      }
      if (Object.keys(fields).length) data[type][node.handle] = fields;
    }
  }
  return data;
}

// ── Export mode ─────────────────────────────────────────────────────────────
if (EXPORT) {
  const data = await snapshot();
  if (!existsSync('data')) mkdirSync('data');
  writeFileSync(
    BASELINE,
    JSON.stringify({store: STORE, takenAt: new Date().toISOString(), data}, null, 2),
  );
  const fields = Object.values(data).reduce(
    (n, entries) => n + Object.values(entries).reduce((m, f) => m + Object.keys(f).length, 0),
    0,
  );
  console.log(
    `wrote ${BASELINE}: ${Object.keys(data).length} types, ${fields} translatable fields from ${STORE}`,
  );
  process.exit(0);
}

// ── Report mode ─────────────────────────────────────────────────────────────
if (!existsSync(BASELINE)) {
  throw new Error(`${BASELINE} not found — run with --export against the English store first.`);
}
const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
const target = await snapshot();

console.log(`baseline : ${baseline.store}  (${baseline.takenAt.slice(0, 10)})`);
console.log(`target   : ${STORE}`);
if (baseline.store === STORE) {
  console.log('\nNOTE: baseline and target are the same store, so everything reads as English.');
}
console.log('');

const totals = {translated: 0, english: 0, missing: 0};
const findings = [];

for (const [type, entries] of Object.entries(baseline.data)) {
  const stats = {translated: 0, english: 0, missing: 0};
  for (const [handle, fields] of Object.entries(entries)) {
    for (const [key, enValue] of Object.entries(fields)) {
      const got = target[type]?.[handle]?.[key];
      if (got === undefined || got === '') {
        stats.missing++;
        findings.push(['MISSING', type, handle, key, enValue]);
      } else if (got.trim() === enValue.trim()) {
        stats.english++;
        findings.push(['ENGLISH', type, handle, key, enValue]);
      } else {
        stats.translated++;
      }
    }
  }
  const n = stats.translated + stats.english + stats.missing;
  if (!n) continue;
  for (const k of Object.keys(totals)) totals[k] += stats[k];
  console.log(
    `${type.padEnd(16)} ${String(Math.round((stats.translated / n) * 100)).padStart(3)}% done   ` +
      `${String(stats.translated).padStart(4)} translated  ` +
      `${String(stats.english).padStart(4)} still English  ` +
      `${String(stats.missing).padStart(4)} missing`,
  );
}

const n = totals.translated + totals.english + totals.missing;
console.log(
  `\n${'TOTAL'.padEnd(16)} ${String(Math.round((totals.translated / n) * 100)).padStart(3)}% done   ` +
    `${String(totals.translated).padStart(4)} translated  ` +
    `${String(totals.english).padStart(4)} still English  ` +
    `${String(totals.missing).padStart(4)} missing`,
);

const show = SHOW_ALL ? findings : findings.slice(0, 25);
if (show.length) {
  console.log(`\n${SHOW_ALL ? 'All' : 'First ' + show.length} of ${findings.length} findings:`);
  for (const [kind, type, handle, key, enValue] of show) {
    console.log(`  ${kind} ${type}/${handle} -> ${key}: "${enValue.slice(0, 60)}"`);
  }
  if (!SHOW_ALL && findings.length > show.length) {
    console.log(`  ... ${findings.length - show.length} more — re-run with --all`);
  }
}

process.exitCode = totals.english + totals.missing > 0 ? 1 : 0;
