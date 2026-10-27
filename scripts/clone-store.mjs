/**
 * Runs the whole store clone, in order, with a preflight check before each
 * phase and a resume point after any failure.
 *
 *   node scripts/clone-store.mjs --phase source --dry-run
 *   node scripts/clone-store.mjs --phase source
 *   # copy the data/ files into the new repo, then from THERE:
 *   node scripts/clone-store.mjs --phase target --dry-run
 *   node scripts/clone-store.mjs --phase target
 *
 *   --from 5   resume at step 5 after fixing a failure
 *   --only 5   run step 5 by itself
 *
 * Why two phases rather than one command: the scripts disagree about which
 * store they mean. migrate-definitions and migrate-products read SHOPIFY_* and
 * write NEW_*, while everything else acts on SHOPIFY_*. Rather than rewrite all
 * of them, the split matches how it actually works:
 *
 *   source phase — run in the OLD repo, where NEW_* names the new store
 *   target phase — run in the NEW repo, where the new store IS SHOPIFY_*
 *
 * Each phase refuses to run in the wrong repo, because the failure mode is
 * silent: a target-phase step run from the old repo cheerfully rewrites the
 * old store instead.
 */
import {spawnSync} from 'child_process';
import {existsSync, readFileSync} from 'fs';
import {loadEnv, resolveStore} from './store-env.mjs';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1];
};
const PHASE = flag('--phase');
const DRY = args.includes('--dry-run');
const FROM = Number(flag('--from') ?? 1);
const ONLY = flag('--only') ? Number(flag('--only')) : null;

if (PHASE !== 'source' && PHASE !== 'target') {
  console.error('Usage: node scripts/clone-store.mjs --phase source|target [--dry-run] [--from N] [--only N]');
  process.exit(1);
}

const env = loadEnv();
const hasNew = Boolean(env.NEW_STORE_DOMAIN || env.NEW_ADMIN_ACCESS_TOKEN);

/** Files the target phase cannot invent — they are produced by the source phase. */
const CARRIED_FILES = [
  'data/metaobject-entries.json',
  'data/metaobject-files.json',
  'data/product-media.json',
  'data/en-baseline.json',
];

const PHASES = {
  source: [
    ['Metaobject definitions -> new store', 'migrate-definitions.mjs', ['--apply']],
    ['Products and variants -> new store', 'migrate-products.mjs', ['--apply']],
    ['Export metaobject entries + file manifest', 'export-metaobjects.mjs', []],
    ['Export product media manifest', 'migrate-product-media.mjs', ['--export']],
    ['Snapshot English baseline for translation tracking', 'check-translations.mjs', ['--export']],
  ],
  target: [
    ['Upload files (images) to this store', 'migrate-files.mjs', []],
    ['Upload product images and variant images', 'migrate-product-media.mjs', []],
    ['Create metaobject entries', 'create-metaobject-entries.mjs', []],
    ['Create the 258 ui_string entries', 'organize-schema.mjs', []],
    ['Add catalogue handles to site_settings', 'add-handle-settings.mjs', []],
    ['Point the journal at this store’s blog', 'add-blog-handle-setting.mjs', []],
    ['Rewrite the 13 variant gids in BookingBody.tsx', 'sync-variant-ids.mjs', ['--apply']],
    ['Set the navigation menus', 'migrate-menus.mjs', ['--apply']],
    ['Create the journal posts', 'create-journal-posts.mjs', []],
    ['Check every ui_string key exists', 'check-ui-strings.mjs', []],
    ['Report what still needs translating', 'check-translations.mjs', []],
  ],
};

// ── Preflight ───────────────────────────────────────────────────────────────

let wouldFail = false;

/**
 * A dry run is for reading the plan, so a preflight problem is reported and
 * the listing still prints. A real run stops.
 */
function fail(message) {
  if (DRY) {
    console.error(`\nWOULD FAIL PREFLIGHT\n\n${message}\n`);
    wouldFail = true;
    return;
  }
  console.error(`\nPREFLIGHT FAILED\n\n${message}\n`);
  process.exit(1);
}

/** Turns a resolveStore throw into the same preflight box as everything else. */
function store(preferNew) {
  try {
    return resolveStore({preferNew, env});
  } catch (e) {
    fail(e.message);
  }
}

async function reachable(domain, token) {
  try {
    const r = await fetch(`https://${domain}/admin/api/2025-01/graphql.json`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'X-Shopify-Access-Token': token},
      body: JSON.stringify({query: '{ shop { name myshopifyDomain } }'}),
    });
    const j = await r.json();
    return j.data?.shop ?? null;
  } catch {
    return null;
  }
}

console.log(`clone-store — ${PHASE} phase${DRY ? ' (dry run)' : ''}\n`);

if (PHASE === 'source') {
  if (!hasNew) {
    fail(
      'The source phase needs NEW_STORE_DOMAIN and NEW_ADMIN_ACCESS_TOKEN in .env —\n' +
        'they name the store being created. Use the <name>.myshopify.com domain.',
    );
  }
  const source = store(false);
  const target = store(true);
  if (source.domain === target.domain) {
    fail('SHOPIFY_STORE_DOMAIN and NEW_STORE_DOMAIN are the same store.');
  }
  // A dry run is for reading the plan, possibly before the new store exists.
  if (DRY) {
    console.log(`  source: ${source.domain}`);
    console.log(`  target: ${target.domain}   (not contacted on a dry run)\n`);
  } else {
    const [s, t] = await Promise.all([
      reachable(source.domain, source.token),
      reachable(target.domain, target.token),
    ]);
    if (!s) fail(`Cannot reach the source store ${source.domain} with SHOPIFY_ADMIN_ACCESS_TOKEN.`);
    if (!t) {
      fail(
        `Cannot reach the new store ${target.domain} with NEW_ADMIN_ACCESS_TOKEN.\n` +
          'Check the token, and that the domain is the myshopify.com one.',
      );
    }
    console.log(`  source: ${s.name}  (${source.domain})`);
    console.log(`  target: ${t.name}  (${target.domain})\n`);
  }
}

if (PHASE === 'target') {
  // Every step now resolves its store the same way, so the target phase runs
  // correctly from either repo: from the old one with NEW_* set, or from the
  // new one where the new store is simply SHOPIFY_*.
  const target = store(true);

  // en-baseline.json records the store the content was exported FROM. If that
  // is where these steps would write, something is pointed the wrong way.
  if (existsSync('data/en-baseline.json')) {
    const baseline = JSON.parse(readFileSync('data/en-baseline.json', 'utf8'));
    if (baseline.store && baseline.store === target.domain) {
      fail(
        `These steps would write to ${target.domain}, which is the store the\n` +
          'content was exported FROM — so this would rewrite the source.\n\n' +
          (hasNew
            ? 'NEW_STORE_DOMAIN points at the source store.'
            : 'Set NEW_STORE_DOMAIN / NEW_ADMIN_ACCESS_TOKEN to the new store,\n' +
              'or run this from the new repo where it is SHOPIFY_STORE_DOMAIN.'),
      );
    }
  }
  if (DRY) {
    console.log(`  target: ${target.domain}   (not contacted on a dry run)`);
  } else {
    const s = await reachable(target.domain, target.token);
    if (!s) fail(`Cannot reach ${target.domain} with SHOPIFY_ADMIN_ACCESS_TOKEN.`);
    console.log(`  target: ${s.name}  (${target.domain})`);
  }

  const missing = CARRIED_FILES.filter((f) => !existsSync(f));
  if (missing.length) {
    fail(
      `These came from the source phase and are not here yet:\n  ${missing.join('\n  ')}\n\n` +
        'Copy them from the old repo’s data/ folder.',
    );
  }
  console.log(`  data files: all ${CARRIED_FILES.length} present\n`);
}

// ── Run ─────────────────────────────────────────────────────────────────────

const steps = PHASES[PHASE];
const selected = steps
  .map((s, i) => ({n: i + 1, name: s[0], script: s[1], args: s[2]}))
  .filter((s) => (ONLY ? s.n === ONLY : s.n >= FROM));

if (DRY) {
  for (const s of steps.map((x, i) => ({n: i + 1, name: x[0], script: x[1], args: x[2]}))) {
    const mark = selected.some((x) => x.n === s.n) ? '>' : ' ';
    console.log(`${mark} ${String(s.n).padStart(2)}. ${s.name}`);
    console.log(`      node scripts/${s.script} ${s.args.join(' ')}`.trimEnd());
  }
  console.log(`\n${selected.length} of ${steps.length} steps would run. Drop --dry-run to go.`);
  if (wouldFail) {
    console.error('\nBut the preflight problems above would stop a real run. Fix them first.');
    process.exitCode = 1;
  }
} else {
  for (const step of selected) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`STEP ${step.n}/${steps.length}  ${step.name}`);
    console.log(`${'='.repeat(70)}`);

    const r = spawnSync(process.execPath, [`scripts/${step.script}`, ...step.args], {
      stdio: 'inherit',
    });

    // check-translations exits non-zero while anything is untranslated, which
    // is its normal state on a store that was just built.
    const informational = step.script === 'check-translations.mjs';
    if (r.status !== 0 && !informational) {
      console.error(`\n${'!'.repeat(70)}`);
      console.error(`STEP ${step.n} FAILED — stopping here so nothing runs out of order.`);
      console.error(`Fix the cause, then resume with:`);
      console.error(`  node scripts/clone-store.mjs --phase ${PHASE} --from ${step.n}`);
      console.error(`${'!'.repeat(70)}`);
      process.exit(1);
    }
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`${PHASE} phase complete.`);
  if (PHASE === 'source') {
    console.log('\nNext: copy these into the new repo, then run the target phase there:');
    for (const f of CARRIED_FILES) console.log(`  ${f}`);
  } else {
    console.log('\nNext:');
    console.log('  1. Commit the BookingBody.tsx change from the variant-id step.');
    console.log('  2. Publish the products to the Headless sales channel in Admin,');
    console.log('     or the Storefront API returns nothing and every page looks empty.');
    console.log('  3. Translate the content — check-translations.mjs above is the worklist.');
  }
  console.log(`${'='.repeat(70)}`);
}
