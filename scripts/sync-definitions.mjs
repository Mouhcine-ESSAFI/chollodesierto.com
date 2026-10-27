// Creates any metaobject definition listed in data/metaobject-definitions.json
// that does not yet exist on the target store. Idempotent — existing
// definitions are left untouched.
//
//   node scripts/sync-definitions.mjs            # dry run
//   node scripts/sync-definitions.mjs --apply
//
// Targets SHOPIFY_STORE_DOMAIN / SHOPIFY_ADMIN_ACCESS_TOKEN.
//
// Unlike migrate-definitions.mjs (which copies from the old store), this one
// treats the JSON file as the source of truth, so new types can be added by
// editing the file.

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "2025-01";
const APPLY = process.argv.includes("--apply");
const STORE = process.env.SHOPIFY_STORE_DOMAIN;
const TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

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

const CREATE = `
  mutation CreateDefinition($definition: MetaobjectDefinitionCreateInput!) {
    metaobjectDefinitionCreate(definition: $definition) {
      metaobjectDefinition { id type fieldDefinitions { key } }
      userErrors { field message code }
    }
  }
`;

const spec = JSON.parse(
  readFileSync(join(__dirname, "..", "data", "metaobject-definitions.json"), "utf-8"),
);

const live = await gql(`{ metaobjectDefinitions(first: 50) { nodes { type } } }`);
const existing = new Set(live.metaobjectDefinitions.nodes.map((n) => n.type));

const missing = spec.filter((d) => !existing.has(d.type));
console.log(`store:   ${STORE}`);
console.log(`in file: ${spec.length}   already on store: ${spec.length - missing.length}   to create: ${missing.length}`);
for (const d of missing) console.log(`   + ${d.type} (${d.fieldDefinitions.length} fields)`);

if (!missing.length) { console.log("\nNothing to do."); process.exit(0); }
if (!APPLY) { console.log("\nDRY RUN — pass --apply to create."); process.exit(0); }

console.log("");
for (const source of missing) {
  const { _sourceId, ...definition } = source;
  const res = await gql(CREATE, { definition });
  const r = res.metaobjectDefinitionCreate;
  if (r.userErrors.length) {
    console.error(`  ! ${definition.type}:`, JSON.stringify(r.userErrors));
    process.exitCode = 1;
    continue;
  }
  console.log(`  -> ${r.metaobjectDefinition.type} (${r.metaobjectDefinition.fieldDefinitions.length} fields)`);
}
