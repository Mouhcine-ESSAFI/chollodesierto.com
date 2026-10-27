// Attaches placeholder images to the metaobject file_reference fields.
//
//   node scripts/seed-test-images.mjs            # dry run
//   node scripts/seed-test-images.mjs --apply
//
// WHY IT WORKS THIS WAY: uploading to Shopify Files needs `write_files`, which
// this app does not have. `write_products` does allow productCreateMedia, and
// the MediaImage gids it returns are valid values for a metaobject
// file_reference. So the images are uploaded as media on the tour product and
// referenced from there.
//
// These are PLACEHOLDERS (Unsplash, the same set the hardcoded components used).
// When real photography exists and the app has `write_files`, upload properly to
// Content > Files and repoint these fields.
//
// Re-runnable: media is tagged via alt text "seed:<key>" and reused.

const API = "2025-01";
const APPLY = process.argv.includes("--apply");
const STORE = process.env.SHOPIFY_STORE_DOMAIN;
const TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const HOST_PRODUCT = "3-day-sahara-tour";

if (!STORE || !TOKEN) {
  console.error("Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN env vars.");
  process.exit(1);
}

const U = (id, w = 1200) => `https://images.unsplash.com/photo-${id}?w=${w}&q=80`;

// NOTE: three photo ids that the hardcoded components had been using are dead
// upstream (Shopify's fetch returns FAILED, and the browser was already logging
// ERR_BLOCKED_BY_ORB for them): 1539650116574, 1530939027401, 1687789568716.
// They are dropped, and their slots reuse working images below.
/** key -> {url, alt} */
const IMAGES = {
  "erg-chebbi":    { url: U("1509316785289-025f5b846b35"), alt: "Erg Chebbi dunes at golden hour" },
  "camp-comfort":  { url: U("1504280390367-361c6d9f38f4"), alt: "Private comfort tent in the Sahara" },
  "camp-superior": { url: U("1506905925346-21bda4d32df4"), alt: "Traveler walking a dune ridge at sunset" },
  "kasbah":        { url: U("1597212618440-806262de4f6b"), alt: "Kasbah village by the river" },
  "quad":          { url: U("1542401886-65d6c61db217"), alt: "Travelers and camels at a desert camp" },
  "campfire":      { url: U("1473580044384-7ba9967e16a0"), alt: "Campfire glowing in the desert night" },
  "guide":         { url: U("1489493887464-892be6d1daae"), alt: "Berber guide in a blue robe" },
  "atlas":         { url: U("1539020140153-e479b8c22e70"), alt: "Ait Ben Haddou kasbah at golden hour" },
  "group":         { url: U("1517824806704-9040b037703b"), alt: "Tour group in the desert" },
  "caravan":       { url: U("1580820267682-426da823b514"), alt: "Camel caravan crossing the Sahara" },
};

/** metaobject type -> handle -> { field: key | [keys] } */
const ASSIGNMENTS = {
  tour_route: {
    "reverse-crossing": { image: "caravan" },
    "classic-loop": { image: "kasbah" },
    "grand-crossing": { image: "erg-chebbi" },
  },
  camp_tier: {
    shared: { image: "campfire" },
    comfort: { image: "camp-comfort" },
    superior: { image: "camp-superior" },
  },
  gallery_item: {
    "gallery-kasbah-village": { image: "kasbah" },
    "gallery-quad-bike": { image: "quad" },
    "gallery-campfire": { image: "campfire" },
    "gallery-berber-guide": { image: "guide" },
    "gallery-camel-rider": { image: "atlas" },
    "gallery-tour-group": { image: "group" },
  },
  journey_day: {
    "grand-crossing-day-1": { images: ["atlas", "camp-superior", "kasbah"] },
    "grand-crossing-day-2": { images: ["erg-chebbi", "kasbah", "campfire"] },
    "grand-crossing-day-3": { images: ["camp-comfort", "caravan", "guide"] },
  },
  site_settings: {
    "site-settings": { hero_poster: "quad" },
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PRODUCT_MEDIA = `
  query ProductMedia($query: String!) {
    products(first: 1, query: $query) {
      nodes {
        id
        media(first: 250) {
          nodes { ... on MediaImage { id status alt } }
        }
      }
    }
  }
`;

async function loadProduct() {
  const d = await gql(PRODUCT_MEDIA, { query: `handle:${HOST_PRODUCT}` });
  const p = d.products.nodes[0];
  if (!p) throw new Error(`Host product "${HOST_PRODUCT}" not found on ${STORE}`);
  // `media` is a connection; flatten it and drop non-image media.
  return { id: p.id, media: (p.media?.nodes ?? []).filter(Boolean) };
}

let product = await loadProduct();
const tagOf = (key) => `seed:${key}`;
const existing = new Map(
  product.media.filter((m) => m?.alt?.startsWith("seed:")).map((m) => [m.alt, m]),
);

const missing = Object.keys(IMAGES).filter((k) => !existing.has(tagOf(k)));

console.log(`store:   ${STORE}`);
console.log(`host:    ${HOST_PRODUCT}`);
console.log(`images:  ${Object.keys(IMAGES).length} total, ${existing.size} already uploaded, ${missing.length} to upload`);

const targets = Object.entries(ASSIGNMENTS).flatMap(([type, byHandle]) =>
  Object.entries(byHandle).map(([handle, fields]) => ({ type, handle, fields })),
);
console.log(`targets: ${targets.length} metaobject entries`);
for (const t of targets) {
  const desc = Object.entries(t.fields)
    .map(([f, v]) => `${f}=${Array.isArray(v) ? v.join("+") : v}`)
    .join(", ");
  console.log(`   ${t.type}/${t.handle}  ${desc}`);
}

if (!APPLY) {
  console.log("\nDRY RUN — pass --apply to upload and attach.");
  process.exit(0);
}

// ── 0. clear out failed/stale media from earlier runs ──────────────────────
const junk = product.media.filter(
  (m) => m.status === "FAILED" || m.alt === "probe test image",
);
if (junk.length) {
  console.log(`\nremoving ${junk.length} failed/stale media...`);
  const res = await gql(
    `mutation D($productId: ID!, $mediaIds: [ID!]!) {
       productDeleteMedia(productId: $productId, mediaIds: $mediaIds) {
         deletedMediaIds
         mediaUserErrors { field message }
       }
     }`,
    { productId: product.id, mediaIds: junk.map((m) => m.id) },
  );
  const r = res.productDeleteMedia;
  if (r.mediaUserErrors.length) console.warn("  ! ", JSON.stringify(r.mediaUserErrors));
  console.log(`  removed ${r.deletedMediaIds.length}`);
  product = await loadProduct();
}

// ── 1. upload missing media ────────────────────────────────────────────────
if (missing.length) {
  console.log(`\nuploading ${missing.length} images...`);
  const media = missing.map((k) => ({
    originalSource: IMAGES[k].url,
    mediaContentType: "IMAGE",
    alt: tagOf(k),
  }));
  const res = await gql(
    `mutation M($id: ID!, $media: [CreateMediaInput!]!) {
       productCreateMedia(productId: $id, media: $media) {
         media { ... on MediaImage { id status alt } }
         mediaUserErrors { field message code }
       }
     }`,
    { id: product.id, media },
  );
  const r = res.productCreateMedia;
  if (r.mediaUserErrors.length) {
    console.error("  ! mediaUserErrors:", JSON.stringify(r.mediaUserErrors));
    process.exit(1);
  }
  console.log(`  queued ${r.media.length}`);
}

// ── 2. wait for processing ─────────────────────────────────────────────────
// Shopify fetches the URL asynchronously; a metaobject cannot reference an
// image still in UPLOADED/PROCESSING.
console.log("\nwaiting for media to become READY...");
let ready = new Map();
for (let attempt = 1; attempt <= 30; attempt++) {
  product = await loadProduct();
  ready = new Map(
    product.media
      .filter((m) => m?.alt?.startsWith("seed:") && m.status === "READY")
      .map((m) => [m.alt, m.id]),
  );
  const failed = product.media.filter((m) => m?.status === "FAILED");
  if (failed.length) console.warn(`  ${failed.length} media FAILED`);
  if (ready.size >= Object.keys(IMAGES).length) break;
  process.stdout.write(`  ${ready.size}/${Object.keys(IMAGES).length}\r`);
  await sleep(4000);
}
console.log(`  ${ready.size}/${Object.keys(IMAGES).length} ready`);

const gidFor = (key) => ready.get(tagOf(key));
const unresolved = Object.keys(IMAGES).filter((k) => !gidFor(k));
if (unresolved.length) {
  console.error("Not ready, aborting before touching metaobjects:", unresolved.join(", "));
  process.exit(1);
}

// ── 3. point the metaobject fields at them ─────────────────────────────────
const BY_HANDLE = `query H($handle: MetaobjectHandleInput!) { metaobjectByHandle(handle: $handle) { id } }`;
const UPDATE = `
  mutation Upd($id: ID!, $metaobject: MetaobjectUpdateInput!) {
    metaobjectUpdate(id: $id, metaobject: $metaobject) {
      metaobject { handle }
      userErrors { field message code }
    }
  }
`;

console.log("\nattaching to metaobjects...");
let ok = 0;
for (const { type, handle, fields } of targets) {
  const found = await gql(BY_HANDLE, { handle: { type, handle } });
  if (!found.metaobjectByHandle) {
    console.error(`  ! ${type}/${handle} not found`);
    continue;
  }
  const fieldInput = Object.entries(fields).map(([key, val]) => ({
    key,
    // list.file_reference takes a JSON array of gids; file_reference a bare gid.
    value: Array.isArray(val) ? JSON.stringify(val.map(gidFor)) : gidFor(val),
  }));
  const res = await gql(UPDATE, {
    id: found.metaobjectByHandle.id,
    metaobject: { fields: fieldInput },
  });
  const r = res.metaobjectUpdate;
  if (r.userErrors.length) {
    console.error(`  ! ${type}/${handle}:`, JSON.stringify(r.userErrors));
    continue;
  }
  ok++;
  console.log(`  -> ${type}/${handle}  ${fieldInput.map((f) => f.key).join(", ")}`);
}
console.log(`\nattached ${ok}/${targets.length}`);
