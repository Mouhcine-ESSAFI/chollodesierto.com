/**
 * Uploads a local image to Shopify Files and points a page_section at it.
 *
 * Keeps artwork in Shopify rather than bundling it into the app, so the store
 * owner can swap the photo from Admin without a deploy. Needs `write_files`.
 *
 * Usage:
 *   node scripts/upload-hero-photo.mjs <file> --section blog.index \
 *        --alt "Lone traveler walking a Sahara dune ridge" [--dry-run]
 */
import {readFileSync, statSync} from 'fs';
import {basename} from 'path';

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const FILE = args.find((a) => !a.startsWith('--'));
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i > -1 ? args[i + 1] : fallback;
};
const SECTION = arg('section');
const ALT = arg('alt', '');
if (!FILE) throw new Error('give a file path');

const env = {};
for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const STORE = env.SHOPIFY_STORE_DOMAIN || env.PUBLIC_STORE_DOMAIN;
const TOKEN = env.SHOPIFY_ADMIN_ACCESS_TOKEN;
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
const check = (p, label) => {
  const e = p?.userErrors ?? p?.mediaUserErrors ?? [];
  if (e.length) throw new Error(`${label}: ${JSON.stringify(e)}`);
  return p;
};

const name = basename(FILE);
const size = statSync(FILE).size;
console.log(`uploading ${name} (${size} bytes)`);
if (DRY) {
  console.log(`[dry-run] would upload and set ${SECTION ?? '(no section)'}.image`);
  process.exit(0);
}

// 1. Ask Shopify for a signed upload target.
const staged = check(
  (
    await gql(
      `mutation S($input: [StagedUploadInput!]!) {
         stagedUploadsCreate(input: $input) {
           stagedTargets { url resourceUrl parameters { name value } }
           userErrors { field message } } }`,
      {
        input: [
          {filename: name, mimeType: 'image/jpeg', resource: 'FILE', httpMethod: 'POST', fileSize: String(size)},
        ],
      },
    )
  ).stagedUploadsCreate,
  'stagedUploadsCreate',
).stagedTargets[0];

// 2. POST the bytes to it.
const form = new FormData();
for (const p of staged.parameters) form.append(p.name, p.value);
form.append('file', new Blob([readFileSync(FILE)], {type: 'image/jpeg'}), name);
const up = await fetch(staged.url, {method: 'POST', body: form});
if (!up.ok) throw new Error(`upload failed: HTTP ${up.status} ${await up.text()}`);
console.log('bytes uploaded');

// 3. Register it as a file in the store.
const created = check(
  (
    await gql(
      `mutation F($files: [FileCreateInput!]!) {
         fileCreate(files: $files) {
           files { ... on MediaImage { id fileStatus } }
           userErrors { field message } } }`,
      {files: [{originalSource: staged.resourceUrl, contentType: 'IMAGE', alt: ALT}]},
    )
  ).fileCreate,
  'fileCreate',
).files[0];

// Shopify processes asynchronously; a non-READY file would render as nothing.
let id = created.id;
let url = null;
for (let i = 0; i < 30; i++) {
  await new Promise((r) => setTimeout(r, 2000));
  const n = await gql(`query N($id: ID!) { node(id: $id) { ... on MediaImage {
    fileStatus image { url width height } } } }`, {id});
  if (n.node?.fileStatus === 'READY' && n.node.image?.url) {
    url = n.node.image.url;
    console.log(`READY — ${n.node.image.width}x${n.node.image.height}`);
    break;
  }
  if (n.node?.fileStatus === 'FAILED') throw new Error('Shopify failed to process the image');
}
if (!url) throw new Error('image did not reach READY in time');
console.log(`file id: ${id}`);

// 4. Point the page_section at it.
if (SECTION) {
  const all = await gql(`query { metaobjects(type: "page_section", first: 150) {
    nodes { id handle fields { key value } } } }`);
  const node = all.metaobjects.nodes.find(
    (n) => n.fields.find((f) => f.key === 'key')?.value === SECTION,
  );
  if (!node) throw new Error(`page_section ${SECTION} not found`);
  const existing = node.fields.find((f) => f.key === 'image')?.value;
  if (existing) {
    console.log(`${SECTION}.image already set (${existing}) — left alone`);
  } else {
    const r = await gql(
      `mutation U($id: ID!, $m: MetaobjectUpdateInput!) {
         metaobjectUpdate(id: $id, metaobject: $m) {
           metaobject { handle } userErrors { field message } } }`,
      {id: node.id, m: {fields: [{key: 'image', value: id}]}},
    );
    check(r.metaobjectUpdate, SECTION);
    console.log(`set ${SECTION}.image`);
  }
}
