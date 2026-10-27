// Step 1 of the store rebuild: copy metaobject DEFINITIONS to the new store.
//
//   node scripts/migrate-definitions.mjs            # export + dry run
//   node scripts/migrate-definitions.mjs --apply    # export + create on new store
//
// Reads the old store via SHOPIFY_STORE_DOMAIN / SHOPIFY_ADMIN_ACCESS_TOKEN,
// writes data/metaobject-definitions.json, then creates them on
// NEW_STORE_DOMAIN / NEW_ADMIN_ACCESS_TOKEN.
//
// Every definition is created with storefront access PUBLIC_READ. Without it
// the Storefront API returns zero entries with no error, which is exactly the
// failure that cost two debugging rounds on the old store.

import { writeFileSync } from "fs";
import { resolveStore } from "./store-env.mjs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "2025-01";
const APPLY = process.argv.includes("--apply");

// Dropped deliberately: native Shopify menus are used for navigation instead.
const SKIP_TYPES = new Set(["nav_link"]);

// Reads .env (with real environment variables taking precedence) so this runs
// the same way from a shell or from clone-store.mjs, which spawns it without
// exported vars.
const OLD = resolveStore({ preferNew: false });
const NEW = resolveStore({ preferNew: true });
if (OLD.domain === NEW.domain) {
  console.error("SHOPIFY_STORE_DOMAIN and NEW_STORE_DOMAIN are the same store — nothing to copy.");
  process.exit(1);
}

for (const [label, s] of [["old", OLD], ["new", NEW]]) {
  if (!s.domain || !s.token) {
    console.error(`Missing ${label}-store domain/token env vars.`);
    process.exit(1);
  }
}

async function gql(store, query, variables) {
  const res = await fetch(`https://${store.domain}/admin/api/${API}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": store.token },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors, null, 2));
  return json.data;
}

const EXPORT_QUERY = `
  query Definitions {
    metaobjectDefinitions(first: 50) {
      nodes {
        id
        type
        name
        displayNameKey
        access { admin storefront }
        fieldDefinitions {
          key
          name
          description
          required
          type { name }
          validations { name value }
        }
      }
    }
  }
`;

const CREATE = `
  mutation CreateDefinition($definition: MetaobjectDefinitionCreateInput!) {
    metaobjectDefinitionCreate(definition: $definition) {
      metaobjectDefinition { id type fieldDefinitions { key } }
      userErrors { field message code }
    }
  }
`;

const data = await gql(OLD, EXPORT_QUERY);
const all = data.metaobjectDefinitions.nodes;
const kept = all.filter((d) => !SKIP_TYPES.has(d.type));

console.log(`exported ${all.length} definitions from ${OLD.domain}`);
for (const t of all.filter((d) => SKIP_TYPES.has(d.type))) console.log(`  skipping ${t.type} (intentionally dropped)`);

// metaobject_reference fields carry a `metaobject_definition_id` validation
// pointing at a definition in the OLD store. Those gids mean nothing on the new
// store, so map them old-gid -> type here and re-resolve to the new gid at
// creation time.
const typeByOldGid = Object.fromEntries(all.map((d) => [d.id, d.type]));

const spec = kept.map((d) => ({
  _sourceId: d.id,
  type: d.type,
  name: d.name,
  displayNameKey: d.displayNameKey ?? undefined,
  // Force storefront reads on — the old store had these off by default, which
  // makes the Storefront API return zero entries with no error.
  // `admin` is deliberately omitted: Shopify rejects it on create for any type
  // that isn't app-reserved (ADMIN_ACCESS_INPUT_NOT_ALLOWED).
  access: { storefront: "PUBLIC_READ" },
  fieldDefinitions: d.fieldDefinitions.map((f) => ({
    key: f.key,
    name: f.name,
    description: f.description ?? undefined,
    required: !!f.required,
    type: f.type.name,
    validations: (f.validations ?? []).map((v) => ({ name: v.name, value: v.value })),
  })),
}));

const outPath = join(__dirname, "..", "data", "metaobject-definitions.json");
writeFileSync(outPath, JSON.stringify(spec, null, 2) + "\n", "utf-8");
console.log(`wrote ${outPath} (${spec.length} definitions)`);

for (const d of spec) {
  console.log(`  ${d.type.padEnd(18)} ${d.fieldDefinitions.length} fields  storefront=${d.access.storefront}`);
}

if (!APPLY) {
  console.log("\nDRY RUN — pass --apply to create these on " + NEW.domain);
  process.exit(0);
}

/** Types this definition points at via metaobject_reference validations. */
function referencedTypes(def) {
  const out = new Set();
  for (const f of def.fieldDefinitions) {
    for (const v of f.validations ?? []) {
      if (v.name === "metaobject_definition_id") {
        const t = typeByOldGid[v.value];
        if (t && t !== def.type) out.add(t);
      }
    }
  }
  return out;
}

// Create referenced types first, so their new gids exist when a dependant needs
// them. journey_day -> review + tour_route is the only chain today, but this
// stays correct if more are added.
const pending = [...spec];
const ordered = [];
const done = new Set();
while (pending.length) {
  const next = pending.findIndex((d) => [...referencedTypes(d)].every((t) => done.has(t)));
  if (next === -1) {
    console.error("Circular metaobject references, cannot order:", pending.map((d) => d.type).join(", "));
    process.exit(1);
  }
  const [d] = pending.splice(next, 1);
  ordered.push(d);
  done.add(d.type);
}
console.log("creation order:", ordered.map((d) => d.type).join(" -> "));

console.log(`\ncreating on ${NEW.domain}...`);
const newGidByType = {};
let ok = 0;
for (const source of ordered) {
  // Strip bookkeeping keys and re-point reference validations at the new store.
  const {_sourceId, ...definition} = source;
  definition.fieldDefinitions = definition.fieldDefinitions.map((f) => ({
    ...f,
    validations: (f.validations ?? []).map((v) => {
      if (v.name !== "metaobject_definition_id") return v;
      const targetType = typeByOldGid[v.value];
      const remapped = newGidByType[targetType];
      if (!remapped) throw new Error(`No new definition yet for ${targetType} (needed by ${definition.type}.${f.key})`);
      return {name: v.name, value: remapped};
    }),
  }));

  const res = await gql(NEW, CREATE, { definition });
  const r = res.metaobjectDefinitionCreate;
  if (r.userErrors.length) {
    console.error(`  ! ${definition.type}:`, JSON.stringify(r.userErrors));
    continue;
  }
  newGidByType[r.metaobjectDefinition.type] = r.metaobjectDefinition.id;
  ok++;
  const remaps = definition.fieldDefinitions.filter((f) =>
    (f.validations ?? []).some((v) => v.name === "metaobject_definition_id"),
  );
  const note = remaps.length ? `  (re-pointed: ${remaps.map((f) => f.key).join(", ")})` : "";
  console.log(`  -> ${r.metaobjectDefinition.type} (${r.metaobjectDefinition.fieldDefinitions.length} fields)${note}`);
}
console.log(`\ncreated ${ok}/${spec.length}`);
