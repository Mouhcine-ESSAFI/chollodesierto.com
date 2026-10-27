/**
 * Copies product images and variant image assignments to the new store.
 *
 * migrate-products.mjs carries title, description, type, vendor, status,
 * options and variant prices — but no media. The storefront reads
 * `featuredImage` and variant `image`, so without this step the booking page's
 * add-on cards come out blank on a cloned store.
 *
 *   node scripts/migrate-product-media.mjs --export   # from the SOURCE repo
 *   node scripts/migrate-product-media.mjs --dry-run  # from the TARGET repo
 *   node scripts/migrate-product-media.mjs            # from the TARGET repo
 *
 * --export reads SHOPIFY_STORE_DOMAIN and writes data/product-media.json.
 * The apply pass targets NEW_STORE_DOMAIN / NEW_ADMIN_ACCESS_TOKEN when set,
 * otherwise SHOPIFY_STORE_DOMAIN.
 *
 * Shopify ingests a public CDN URL directly, so the bytes never pass through
 * here — the manifest holds the source store's URLs and the target fetches
 * them itself.
 *
 * Idempotent: a product that already has media is left alone.
 */
import {readFileSync, writeFileSync, existsSync, mkdirSync} from 'fs';
import {resolveStore} from './store-env.mjs';

const EXPORT = process.argv.includes('--export');
const DRY = process.argv.includes('--dry-run');
const MANIFEST = 'data/product-media.json';

const {domain: STORE, token: TOKEN} = resolveStore({preferNew: !EXPORT});

async function gql(query, variables) {
  const r = await fetch(`https://${STORE}/admin/api/2025-01/graphql.json`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN},
    body: JSON.stringify({query, variables}),
  });
  const j = await r.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors, null, 2));
  return j.data;
}

function check(result, label) {
  const errs = result.userErrors ?? result.mediaUserErrors ?? [];
  if (errs.length) throw new Error(`${label}: ${JSON.stringify(errs)}`);
  return result;
}

const filenameOf = (url) => decodeURIComponent((url ?? '').split('?')[0].split('/').pop() ?? '');

const PRODUCTS_QUERY = `
  query {
    products(first: 50) {
      nodes {
        id
        handle
        media(first: 50) { nodes { __typename ... on MediaImage { id alt image { url } } } }
        variants(first: 100) { nodes { id title image { url } } }
      }
    }
  }
`;

async function exportManifest() {
  const products = (await gql(PRODUCTS_QUERY)).products.nodes;
  const out = products
    .map((p) => ({
      handle: p.handle,
      media: p.media.nodes
        .filter((m) => m.__typename === 'MediaImage' && m.image?.url)
        .map((m) => ({filename: filenameOf(m.image.url), url: m.image.url, alt: m.alt ?? ''})),
      // Variant images are matched back by filename once the media exists on
      // the target — variant ids differ per store.
      variantImages: p.variants.nodes
        .filter((v) => v.image?.url)
        .map((v) => ({title: v.title, filename: filenameOf(v.image.url)})),
    }))
    .filter((p) => p.media.length);

  if (!existsSync('data')) mkdirSync('data');
  writeFileSync(MANIFEST, JSON.stringify(out, null, 2));

  const images = out.reduce((n, p) => n + p.media.length, 0);
  const vImages = out.reduce((n, p) => n + p.variantImages.length, 0);
  console.log(`source: ${STORE}`);
  for (const p of out) {
    console.log(
      `  ${p.handle.padEnd(20)} ${p.media.length} images, ${p.variantImages.length} variant assignments`,
    );
  }
  console.log(`\nwrote ${MANIFEST}: ${images} images, ${vImages} variant assignments`);
}

/**
 * Media ingest is async. A variant cannot be pointed at media that is still
 * PROCESSING, and the failure reads as an unhelpful "media not found".
 */
async function waitForMedia(productId, expected) {
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const d = await gql(
      `query($id: ID!) { product(id: $id) { media(first: 50) {
         nodes { ... on MediaImage { id status image { url } } } } } }`,
      {id: productId},
    );
    const nodes = d.product.media.nodes.filter(Boolean);
    if (nodes.length >= expected && nodes.every((n) => n.status === 'READY')) return nodes;
  }
  return [];
}

async function apply() {
  if (!existsSync(MANIFEST)) {
    throw new Error(`${MANIFEST} not found — run with --export from the source repo first.`);
  }
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  const live = (await gql(PRODUCTS_QUERY)).products.nodes;
  const byHandle = new Map(live.map((p) => [p.handle, p]));

  console.log(`target: ${STORE}\n`);
  const tally = {products: 0, images: 0, variants: 0, skipped: 0, failed: 0};

  for (const spec of manifest) {
    const product = byHandle.get(spec.handle);
    if (!product) {
      console.error(`  !  ${spec.handle}: not on the target — run migrate-products.mjs first`);
      tally.failed++;
      continue;
    }
    if (product.media.nodes.length) {
      console.log(`  =  ${spec.handle} (already has ${product.media.nodes.length} images)`);
      tally.skipped++;
      continue;
    }
    if (DRY) {
      console.log(
        `  [dry-run] ${spec.handle}: ${spec.media.length} images, ` +
          `${spec.variantImages.length} variant assignments`,
      );
      tally.products++;
      continue;
    }

    try {
      check(
        (
          await gql(
            `mutation M($productId: ID!, $media: [CreateMediaInput!]!) {
               productCreateMedia(productId: $productId, media: $media) {
                 media { ... on MediaImage { id } }
                 mediaUserErrors { field message } } }`,
            {
              productId: product.id,
              media: spec.media.map((m) => ({
                originalSource: m.url,
                alt: m.alt,
                mediaContentType: 'IMAGE',
              })),
            },
          )
        ).productCreateMedia,
        `productCreateMedia ${spec.handle}`,
      );
      console.log(`  -> ${spec.handle}: ${spec.media.length} images`);
      tally.products++;
      tally.images += spec.media.length;
    } catch (e) {
      console.error(`  !  ${spec.handle}: ${e.message}`);
      tally.failed++;
      continue;
    }

    if (!spec.variantImages.length) continue;

    const ready = await waitForMedia(product.id, spec.media.length);
    if (!ready.length) {
      console.error(`  !  ${spec.handle}: media never finished processing — variant images not set`);
      tally.failed++;
      continue;
    }

    // Shopify rewrites a filename on ingest when it collides with an existing
    // one, so match on the stem rather than requiring an exact name.
    const findMedia = (filename) => {
      const stem = filename.replace(/\.[^.]+$/, '');
      return ready.find((n) => {
        const got = filenameOf(n.image?.url);
        return got === filename || got.startsWith(stem);
      });
    };

    const updates = [];
    for (const vi of spec.variantImages) {
      const variant = product.variants.nodes.find((v) => v.title === vi.title);
      const media = findMedia(vi.filename);
      if (!variant || !media) {
        console.error(`  !  ${spec.handle}: cannot map variant "${vi.title}" to ${vi.filename}`);
        continue;
      }
      updates.push({id: variant.id, mediaId: media.id});
    }

    if (updates.length) {
      check(
        (
          await gql(
            `mutation V($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
               productVariantsBulkUpdate(productId: $productId, variants: $variants) {
                 userErrors { field message } } }`,
            {productId: product.id, variants: updates},
          )
        ).productVariantsBulkUpdate,
        `productVariantsBulkUpdate ${spec.handle}`,
      );
      console.log(`     ${updates.length} variant images assigned`);
      tally.variants += updates.length;
    }
  }

  console.log(
    `\nproducts=${tally.products} images=${tally.images} variantImages=${tally.variants} ` +
      `skipped=${tally.skipped} failed=${tally.failed}`,
  );
  if (tally.failed) process.exitCode = 1;
}

if (EXPORT) await exportManifest();
else await apply();
