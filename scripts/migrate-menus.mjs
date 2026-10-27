import { resolveStore } from "./store-env.mjs";
// Step 5 of the store rebuild: set the Online Store navigation menus.
//
//   node scripts/migrate-menus.mjs            # dry run
//   node scripts/migrate-menus.mjs --apply    # write the menus
//
// Targets SHOPIFY_STORE_DOMAIN / SHOPIFY_ADMIN_ACCESS_TOKEN, needs
// write_online_store_navigation.
//
// A fresh Shopify store ships main-menu = Home/Catalog/Contact and
// footer = Search, all of which 404 in this Hydrogen app. The links below are
// the real site routes. SiteNavbar reads main-menu at runtime; SiteFooter still
// uses hardcoded links, so populating `footer` here is groundwork for wiring it.

const API = "2025-01";
const APPLY = process.argv.includes("--apply");
// Acts on the NEW_* store when that pair is set, so a clone can be driven
// from this repo without editing .env.
const { domain: STORE, token: TOKEN } = resolveStore({ preferNew: true });

if (!STORE || !TOKEN) {
  console.error("Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN env vars.");
  process.exit(1);
}

// `url` must be absolute for the Admin API; the app maps them back to paths.
const origin = `https://${STORE}`;
const abs = (path) => `${origin}${path}`;

// NOTE on `type`: the storefront root must be FRONTPAGE, not HTTP — a bare
// origin URL sent as HTTP is rejected. Only relevant if a "Home" item is ever
// re-added.
//
// The top nav is deliberately lean: Routes / Reviews / FAQ / Book Now. Home is
// reachable via the logo, and Contact lives in the footer. Do not re-add items
// here without asking — this list is the source of truth and overwrites Admin.
const MENUS = {
  "main-menu": {
    title: "Main menu",
    items: [
      { title: "Routes", url: abs("/#routes") },
      { title: "Reviews", url: abs("/reviews") },
      { title: "FAQ", url: abs("/faq") },
      { title: "Book Now", url: abs("/booking") },
    ],
  },
  footer: {
    title: "Footer menu",
    items: [
      { title: "Book", url: abs("/booking") },
      { title: "Routes", url: abs("/#routes") },
      { title: "Reviews", url: abs("/reviews") },
      { title: "FAQ", url: abs("/faq") },
      { title: "Journal", url: abs("/blog") },
      { title: "About", url: abs("/about") },
      { title: "Contact", url: abs("/contact") },
    ],
  },
};

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

const LIST = `{ menus(first: 20) { nodes { id handle title items { title url } } } }`;

const UPDATE = `
  mutation UpdateMenu($id: ID!, $title: String!, $items: [MenuItemUpdateInput!]!) {
    menuUpdate(id: $id, title: $title, items: $items) {
      menu { handle items { title url } }
      userErrors { field message }
    }
  }
`;

const CREATE = `
  mutation CreateMenu($title: String!, $handle: String!, $items: [MenuItemCreateInput!]!) {
    menuCreate(title: $title, handle: $handle, items: $items) {
      menu { handle items { title url } }
      userErrors { field message }
    }
  }
`;

const existing = (await gql(LIST)).menus.nodes;
console.log(`store: ${STORE}`);
for (const m of existing) {
  console.log(`  current ${m.handle.padEnd(28)} ${m.items.map((i) => i.title).join(" / ") || "(empty)"}`);
}

console.log("\nwill set:");
for (const [handle, def] of Object.entries(MENUS)) {
  console.log(`  ${handle.padEnd(12)} ${def.items.map((i) => i.title).join(" / ")}`);
}

if (!APPLY) {
  console.log("\nDRY RUN — pass --apply to write.");
  process.exit(0);
}

console.log("");
for (const [handle, def] of Object.entries(MENUS)) {
  const found = existing.find((m) => m.handle === handle);
  const items = def.items.map((i) => ({ title: i.title, type: i.type ?? "HTTP", url: i.url }));

  const res = found
    ? await gql(UPDATE, { id: found.id, title: def.title, items })
    : await gql(CREATE, { title: def.title, handle, items });
  const r = found ? res.menuUpdate : res.menuCreate;

  if (r.userErrors.length) {
    console.error(`  ! ${handle}:`, JSON.stringify(r.userErrors));
    process.exitCode = 1;
    continue;
  }
  console.log(`  -> ${handle}: ${r.menu.items.map((i) => i.title).join(" / ")}`);
}

// Re-query rather than trusting the mutation response: Shopify can return the
// full item list while persisting fewer, with no userErrors.
console.log("\nverifying persisted state...");
const after = (await gql(LIST)).menus.nodes;
for (const [handle, def] of Object.entries(MENUS)) {
  const live = after.find((m) => m.handle === handle);
  const got = (live?.items ?? []).map((i) => i.title);
  const want = def.items.map((i) => i.title);
  const missing = want.filter((t) => !got.includes(t));
  if (missing.length) {
    console.error(`  ! ${handle}: ${got.length}/${want.length} persisted — dropped: ${missing.join(", ")}`);
    process.exitCode = 1;
  } else {
    console.log(`  ok ${handle}: ${got.length}/${want.length} — ${got.join(" / ")}`);
  }
}
