/**
 * Gives the two add-on products (quad bike, airport transfer) their images, so
 * the booking form's extras can be driven from Shopify instead of hardcoded
 * URLs. The store has no write_files scope, so images are attached with
 * productCreateMedia — a MediaImage created that way is a first-class file the
 * storefront can read.
 *
 * Images are the exact URLs the booking form already showed, so nothing about
 * the page changes visually; they just become editable in Admin.
 *
 * Idempotent: a product that already has media is left alone. Waits for each
 * upload to reach READY and fails loudly if it doesn't, rather than leaving a
 * half-attached image behind.
 *
 * Usage: node scripts/seed-addon-media.mjs [--dry-run]
 */
import {readFileSync} from 'fs';

const DRY = process.argv.includes('--dry-run');

const env = {};
for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const STORE = env.SHOPIFY_STORE_DOMAIN || env.PUBLIC_STORE_DOMAIN;
const TOKEN = env.SHOPIFY_ADMIN_ACCESS_TOKEN || env.PRIVATE_ADMIN_API_TOKEN;
if (!STORE || !TOKEN) throw new Error('Set SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN in .env');

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

// variant title -> the image that variant should show.
const PLAN = {
  'quad-bike-rental': {
    Individual: {
      src: 'https://images.unsplash.com/photo-1542401886-65d6c61db217?auto=format&fit=crop&w=900&q=80',
      alt: 'Individual quad bike in the dunes',
    },
    Double: {
      src: 'https://images.unsplash.com/photo-1517824806704-9040b037703b?auto=format&fit=crop&w=900&q=80',
      alt: 'Two travelers on a double quad bike',
    },
  },
  'airport-transfer': {
    'One way': {
      src: 'https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=900&q=80',
      alt: 'Private airport transfer vehicle',
    },
  },
};

const PRODUCT = `query P($handle: String!) {
  productByHandle(handle: $handle) {
    id title
    media(first: 20) { nodes { ... on MediaImage { id alt fileStatus } } }
    variants(first: 20) { nodes { id title media(first: 5) { nodes { id } } } }
  }
}`;

for (const [handle, wanted] of Object.entries(PLAN)) {
  const prod = (await gql(PRODUCT, {handle})).productByHandle;
  if (!prod) {
    console.log(`skip ${handle}: product not found`);
    continue;
  }
  const existing = prod.media.nodes.filter((m) => m?.id);
  if (existing.length) {
    console.log(`keep ${handle}: already has ${existing.length} image(s)`);
    continue;
  }
  const entries = Object.entries(wanted);
  if (DRY) {
    console.log(`[dry-run] ${handle}: would attach ${entries.length} image(s)`);
    continue;
  }

  const r = await gql(
    `mutation M($id: ID!, $media: [CreateMediaInput!]!) {
       productCreateMedia(productId: $id, media: $media) {
         media { ... on MediaImage { id } }
         mediaUserErrors { field message }
       } }`,
    {
      id: prod.id,
      media: entries.map(([, img]) => ({
        originalSource: img.src,
        alt: img.alt,
        mediaContentType: 'IMAGE',
      })),
    },
  );
  const errs = r.productCreateMedia.mediaUserErrors;
  if (errs.length) throw new Error(`${handle}: ${JSON.stringify(errs)}`);
  const ids = r.productCreateMedia.media.map((m) => m.id);
  console.log(`sent ${handle}: ${ids.length} image(s) uploading`);

  // Shopify fetches the source asynchronously; a FAILED upload would leave the
  // booking form pointing at a broken image, so confirm READY before moving on.
  let ready = false;
  for (let i = 0; i < 30 && !ready; i++) {
    await new Promise((res) => setTimeout(res, 2000));
    const now = (await gql(PRODUCT, {handle})).productByHandle;
    const states = now.media.nodes.filter((m) => m?.id).map((m) => m.fileStatus);
    ready = states.length === ids.length && states.every((s) => s === 'READY');
    if (states.includes('FAILED')) throw new Error(`${handle}: an upload FAILED`);
  }
  if (!ready) throw new Error(`${handle}: images did not reach READY in time`);
  console.log(`ok   ${handle}: ${ids.length} image(s) READY`);

  // Attach each image to its variant so the booking form can show the right
  // picture per option rather than one image for the whole product.
  const after = (await gql(PRODUCT, {handle})).productByHandle;
  const mediaByAlt = new Map(after.media.nodes.filter((m) => m?.id).map((m) => [m.alt, m.id]));
  for (const [variantTitle, img] of entries) {
    const variant = after.variants.nodes.find((v) => v.title === variantTitle);
    const mediaId = mediaByAlt.get(img.alt);
    if (!variant || !mediaId || variant.media.nodes.length) continue;
    const a = await gql(
      `mutation A($productId: ID!, $variantMedia: [ProductVariantAppendMediaInput!]!) {
         productVariantAppendMedia(productId: $productId, variantMedia: $variantMedia) {
           productVariants { id } userErrors { field message } } }`,
      {productId: prod.id, variantMedia: [{variantId: variant.id, mediaIds: [mediaId]}]},
    );
    const aErrs = a.productVariantAppendMedia.userErrors;
    if (aErrs.length) console.log(`   warn ${variantTitle}: ${JSON.stringify(aErrs)}`);
    else console.log(`   linked "${variantTitle}" to its image`);
  }
}
