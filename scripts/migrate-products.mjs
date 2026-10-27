// Step 2 of the store rebuild: copy PRODUCTS + variants to the new store.
//
//   node scripts/migrate-products.mjs            # export + dry run
//   node scripts/migrate-products.mjs --apply    # export + upsert on new store
//
// Uses productSet keyed by handle, so this is an upsert: re-running it fixes
// prices/options in place rather than creating duplicates. That matters because
// the store currency is still being changed — re-run afterwards to be certain
// prices are what they should be.

import { writeFileSync } from "fs";
import { resolveStore } from "./store-env.mjs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "2025-01";
const APPLY = process.argv.includes("--apply");

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
  query Products {
    products(first: 50) {
      nodes {
        handle
        title
        descriptionHtml
        productType
        vendor
        tags
        status
        options { name position optionValues { name } }
        variants(first: 100) {
          nodes {
            title
            sku
            price
            selectedOptions { name value }
          }
        }
      }
    }
  }
`;

const PRODUCT_SET = `
  mutation SetProduct($input: ProductSetInput!) {
    productSet(synchronous: true, input: $input) {
      product {
        id
        handle
        status
        variants(first: 100) {
          nodes { id price selectedOptions { name value } }
        }
      }
      userErrors { field message code }
    }
  }
`;

const data = await gql(OLD, EXPORT_QUERY);
const products = data.products.nodes;
console.log(`exported ${products.length} products from ${OLD.domain}`);

const spec = products.map((p) => ({
  handle: p.handle,
  title: p.title,
  descriptionHtml: p.descriptionHtml,
  productType: p.productType,
  vendor: p.vendor,
  tags: p.tags,
  status: p.status,
  productOptions: p.options
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((o) => ({ name: o.name, values: o.optionValues.map((v) => ({ name: v.name })) })),
  variants: p.variants.nodes.map((v) => ({
    sku: v.sku || undefined,
    price: v.price,
    optionValues: v.selectedOptions.map((o) => ({ optionName: o.name, name: o.value })),
  })),
}));

const outPath = join(__dirname, "..", "data", "products.json");
writeFileSync(outPath, JSON.stringify(spec, null, 2) + "\n", "utf-8");
console.log(`wrote ${outPath}`);

for (const p of spec) {
  console.log(`  ${p.handle.padEnd(20)} [${p.status}] ${p.variants.length} variants  options: ${p.productOptions.map((o) => o.name).join(" x ")}`);
  for (const v of p.variants) {
    console.log(`      ${String(v.price).padStart(8)}  ${v.optionValues.map((o) => o.name).join(" / ")}`);
  }
}

if (!APPLY) {
  console.log("\nDRY RUN — pass --apply to upsert these on " + NEW.domain);
  process.exit(0);
}

console.log(`\nupserting on ${NEW.domain}...`);
const created = {};
for (const p of spec) {
  const input = { ...p };
  const res = await gql(NEW, PRODUCT_SET, { input });
  const r = res.productSet;
  if (r.userErrors.length) {
    console.error(`  ! ${p.handle}:`, JSON.stringify(r.userErrors));
    continue;
  }
  created[p.handle] = r.product;
  console.log(`  -> ${r.product.handle} [${r.product.status}] ${r.product.variants.nodes.length} variants`);
  for (const v of r.product.variants.nodes) {
    console.log(`       ${String(v.price).padStart(8)}  ${v.selectedOptions.map((o) => o.value).join(" / ")}  ${v.id.split("/").pop()}`);
  }
}

// Emit the new variant gids so the next step can rewrite BookingBody.tsx.
const gidPath = join(__dirname, "..", "data", "new-variant-ids.json");
const gidMap = {};
for (const [handle, product] of Object.entries(created)) {
  gidMap[handle] = product.variants.nodes.map((v) => ({
    id: v.id,
    options: Object.fromEntries(v.selectedOptions.map((o) => [o.name, o.value])),
  }));
}
writeFileSync(gidPath, JSON.stringify(gidMap, null, 2) + "\n", "utf-8");
console.log(`\nwrote ${gidPath}`);
