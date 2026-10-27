// Step 4 of the store rebuild: rewrite the hardcoded ProductVariant gids in
// app/components/BookingBody.tsx to match the target store.
//
//   node scripts/sync-variant-ids.mjs            # dry run, shows the diff
//   node scripts/sync-variant-ids.mjs --apply    # write the file
//
// Reads variants live from SHOPIFY_STORE_DOMAIN / SHOPIFY_ADMIN_ACCESS_TOKEN
// and matches them by product handle + option values, so it is safe to re-run
// against any store. Run this after every store move — those 13 gids are the
// only store-specific values left in the codebase.

import { readFileSync, writeFileSync } from "fs";
import { resolveStore } from "./store-env.mjs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "2025-01";
const APPLY = process.argv.includes("--apply");
// Acts on the NEW_* store when that pair is set, so a clone can be driven
// from this repo without editing .env.
const { domain: STORE, token: TOKEN } = resolveStore({ preferNew: true });

if (!STORE || !TOKEN) {
  console.error("Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN env vars.");
  process.exit(1);
}

async function gql(query, variables) {
  const res = await fetch(`https://${STORE}/admin/api/${API}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": TOKEN },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors, null, 2));
  return json.data;
}

const QUERY = `
  query Variants($query: String!) {
    products(first: 10, query: $query) {
      nodes {
        handle
        variants(first: 100) {
          nodes { id selectedOptions { name value } }
        }
      }
    }
  }
`;

const handles = ["3-day-sahara-tour", "quad-bike-rental", "airport-transfer"];
const byHandle = {};
for (const h of handles) {
  const d = await gql(QUERY, { query: `handle:${h}` });
  const p = d.products.nodes.find((x) => x.handle === h);
  if (!p) { console.error(`Product "${h}" not found on ${STORE}`); process.exit(1); }
  byHandle[h] = p.variants.nodes.map((v) => ({
    id: v.id,
    opts: Object.fromEntries(v.selectedOptions.map((o) => [o.name, o.value])),
  }));
}

/** Option value -> metaobject handle. "Classic Loop" -> classic-loop, "Shared Camp" -> shared. */
const slug = (s) => s.toLowerCase().replace(/\s+camp$/, "").trim().replace(/\s+/g, "-");

function findVariant(handle, predicate, label) {
  const v = byHandle[handle].find(predicate);
  if (!v) { console.error(`No variant on ${handle} for ${label}`); process.exit(1); }
  return v.id;
}

// route-handle + camp-handle -> variant gid
const tourMap = {};
for (const v of byHandle["3-day-sahara-tour"]) {
  const key = `${slug(v.opts["Route"])}-${slug(v.opts["Camp Tier"])}`;
  tourMap[key] = v.id;
}

const quadIndividual = findVariant("quad-bike-rental", (v) => v.opts["Type"] === "Individual", "Type=Individual");
const quadDouble = findVariant("quad-bike-rental", (v) => v.opts["Type"] === "Double", "Type=Double");
const transferOneway = findVariant("airport-transfer", (v) => /one\s*way/i.test(v.opts["Direction"]), "Direction=One way");
const transferReturn = findVariant("airport-transfer", (v) => /return/i.test(v.opts["Direction"]), "Direction=Return");

const filePath = join(__dirname, "..", "app", "components", "BookingBody.tsx");
let src = readFileSync(filePath, "utf-8");
const before = src;
const changes = [];

function swap(regex, resolve, label) {
  src = src.replace(regex, (match, ...groups) => {
    const next = resolve(...groups);
    if (!next) { console.error(`Could not resolve a new gid for ${label}`); process.exit(1); }
    const old = match.match(/gid:\/\/shopify\/ProductVariant\/\d+/)?.[0];
    if (old !== next) changes.push(`${label}${groups[0] ? ` [${groups[0]}]` : ""}: ${old} -> ${next}`);
    return match.replace(/gid:\/\/shopify\/ProductVariant\/\d+/, next);
  });
}

// DEFAULT_TOUR_VARIANT_IDS — keyed '<route-handle>-<camp-handle>'
swap(
  /'([a-z-]+-(?:shared|comfort|superior))':\s*'gid:\/\/shopify\/ProductVariant\/\d+'/g,
  (key) => tourMap[key],
  "tour",
);

// DEFAULT_EXTRAS — matched via the entry's own id field
swap(
  /(id: 'quad-individual')([\s\S]*?variantId: 'gid:\/\/shopify\/ProductVariant\/\d+')/g,
  () => quadIndividual,
  "extra",
);
swap(
  /(id: 'quad-double')([\s\S]*?variantId: 'gid:\/\/shopify\/ProductVariant\/\d+')/g,
  () => quadDouble,
  "extra",
);

// DEFAULT_TRANSFER
swap(/(onewayVariantId): 'gid:\/\/shopify\/ProductVariant\/\d+'/g, () => transferOneway, "transfer");
swap(/(returnVariantId): 'gid:\/\/shopify\/ProductVariant\/\d+'/g, () => transferReturn, "transfer");

const remaining = [...src.matchAll(/gid:\/\/shopify\/ProductVariant\/(\d+)/g)].map((m) => m[0]);
const known = new Set([...Object.values(tourMap), quadIndividual, quadDouble, transferOneway, transferReturn]);
const stale = remaining.filter((g) => !known.has(g));

console.log(`store:   ${STORE}`);
console.log(`variants: ${Object.keys(tourMap).length} tour + 2 quad + 2 transfer`);
console.log(`\n${changes.length} gid(s) to change:`);
for (const c of changes) console.log("  " + c);
if (!changes.length) console.log("  (already in sync)");
if (stale.length) {
  console.error(`\n${stale.length} gid(s) in the file did not match any variant on this store:`);
  for (const s of new Set(stale)) console.error("  " + s);
  process.exit(1);
}

if (!APPLY) {
  console.log("\nDRY RUN — pass --apply to write BookingBody.tsx");
  process.exit(0);
}
if (src === before) { console.log("\nNothing to write."); process.exit(0); }
writeFileSync(filePath, src, "utf-8");
console.log(`\nwrote ${filePath}`);
