/**
 * Uploads every file listed in data/metaobject-files.json to the target store,
 * keeping the filename and the alt text.
 *
 * Without this step a cloned store has all its content and none of its
 * pictures: file_reference fields hold ids that only exist on the source
 * store, and create-metaobject-entries.mjs cannot resolve `ref:file/<name>`
 * against files that were never uploaded.
 *
 *   node scripts/export-metaobjects.mjs            # writes the manifest first
 *   node scripts/migrate-files.mjs --dry-run       # what would upload
 *   node scripts/migrate-files.mjs                 # upload to the target
 *
 * Source bytes are fetched from the URLs in the manifest, which are public
 * Shopify CDN URLs — no source-store credentials are needed here.
 *
 * Target is NEW_STORE_DOMAIN / NEW_ADMIN_ACCESS_TOKEN when set, otherwise
 * SHOPIFY_STORE_DOMAIN. Needs write_files.
 *
 * Idempotent: a filename already present on the target is left alone, so a
 * re-run after a partial failure only uploads what is missing.
 *
 * Alt text is content, not configuration — it is read aloud and it is indexed,
 * so on a Spanish store it should be translated afterwards. check-translations
 * does not see it (it lives on the file, not the metaobject), so it is listed
 * at the end of this run as a reminder.
 */
import {readFileSync, existsSync} from 'fs';
import {resolveStore} from './store-env.mjs';

const DRY = process.argv.includes('--dry-run');
const MANIFEST = 'data/metaobject-files.json';

const {domain: STORE, token: TOKEN} = resolveStore({preferNew: true});
if (!existsSync(MANIFEST)) {
  throw new Error(`${MANIFEST} not found — run scripts/export-metaobjects.mjs first.`);
}

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
  if (result.userErrors?.length) {
    throw new Error(`${label}: ${JSON.stringify(result.userErrors)}`);
  }
  return result;
}

const MIME = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  gif: 'image/gif', svg: 'image/svg+xml', avif: 'image/avif',
  mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
};
const mimeOf = (name) => MIME[name.split('.').pop().toLowerCase()] ?? 'application/octet-stream';

/**
 * SVG goes up as a generic FILE, not an IMAGE: Shopify refuses it as IMAGE and
 * the error ("invalid mime type") does not say why.
 */
function contentTypeOf(name, kind) {
  if (kind === 'Video') return 'VIDEO';
  const ext = name.split('.').pop().toLowerCase();
  if (ext === 'svg') return 'FILE';
  return mimeOf(name).startsWith('image/') ? 'IMAGE' : 'FILE';
}

/** Shopify's filename search is a prefix match, so confirm the exact name. */
async function findExisting(filename) {
  const d = await gql(
    `query F($q: String!) {
       files(first: 20, query: $q) {
         nodes {
           __typename
           ... on MediaImage { id image { url } }
           ... on GenericFile { id url }
           ... on Video { id filename }
         } } }`,
    {q: `filename:${filename}`},
  );
  const nameOf = (n) =>
    n.filename ?? decodeURIComponent((n.image?.url ?? n.url ?? '').split('?')[0].split('/').pop() ?? '');
  return d.files.nodes.find((n) => nameOf(n) === filename) ?? null;
}

async function upload(entry) {
  const {filename, url, alt, kind} = entry;
  const mimeType = mimeOf(filename);
  const contentType = contentTypeOf(filename, kind);

  const bytes = await fetch(url).then(async (r) => {
    if (!r.ok) throw new Error(`source fetch failed: HTTP ${r.status} for ${url}`);
    return Buffer.from(await r.arrayBuffer());
  });

  const staged = check(
    (
      await gql(
        `mutation S($input: [StagedUploadInput!]!) {
           stagedUploadsCreate(input: $input) {
             stagedTargets { url resourceUrl parameters { name value } }
             userErrors { field message } } }`,
        {
          input: [
            {
              filename,
              mimeType,
              resource: contentType === 'VIDEO' ? 'VIDEO' : 'FILE',
              httpMethod: 'POST',
              fileSize: String(bytes.length),
            },
          ],
        },
      )
    ).stagedUploadsCreate,
    'stagedUploadsCreate',
  ).stagedTargets[0];

  const form = new FormData();
  for (const p of staged.parameters) form.append(p.name, p.value);
  form.append('file', new Blob([bytes], {type: mimeType}), filename);
  const up = await fetch(staged.url, {method: 'POST', body: form});
  if (!up.ok) throw new Error(`byte upload failed: HTTP ${up.status} ${await up.text()}`);

  const created = check(
    (
      await gql(
        `mutation F($files: [FileCreateInput!]!) {
           fileCreate(files: $files) {
             files { __typename ... on MediaImage { id } ... on GenericFile { id } ... on Video { id } }
             userErrors { field message } } }`,
        {files: [{originalSource: staged.resourceUrl, contentType, alt}]},
      )
    ).fileCreate,
    'fileCreate',
  ).files[0];

  return created.id;
}

/** A file that is still PROCESSING resolves to nothing when an entry links it. */
async function waitReady(id) {
  for (let i = 0; i < 30; i++) {
    const d = await gql(
      `query N($id: ID!) { node(id: $id) {
         ... on MediaImage { fileStatus } ... on GenericFile { fileStatus } ... on Video { fileStatus } } }`,
      {id},
    );
    const status = d.node?.fileStatus;
    if (status === 'READY') return true;
    if (status === 'FAILED') return false;
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
console.log(`target: ${STORE}`);
console.log(`${manifest.length} files in the manifest\n`);

const tally = {uploaded: 0, skipped: 0, failed: 0};
const pending = [];

for (const entry of manifest) {
  const existing = await findExisting(entry.filename);
  if (existing) {
    console.log(`  =  ${entry.filename} (already on the target)`);
    tally.skipped++;
    continue;
  }
  if (DRY) {
    console.log(`  [dry-run] would upload ${entry.filename} (${entry.kind})`);
    tally.uploaded++;
    continue;
  }
  try {
    const id = await upload(entry);
    pending.push({filename: entry.filename, id});
    console.log(`  -> ${entry.filename}`);
    tally.uploaded++;
  } catch (e) {
    console.error(`  !  ${entry.filename}: ${e.message}`);
    tally.failed++;
  }
}

if (pending.length) {
  console.log('\nwaiting for Shopify to finish processing...');
  for (const p of pending) {
    const ok = await waitReady(p.id);
    if (!ok) {
      console.error(`  !  ${p.filename} never reached READY`);
      tally.failed++;
    }
  }
}

console.log(`\nuploaded=${tally.uploaded} skipped=${tally.skipped} failed=${tally.failed}`);

if (!DRY && tally.failed === 0) {
  const withAlt = manifest.filter((f) => f.alt).length;
  console.log(
    `\n${withAlt} of ${manifest.length} files carry alt text, copied across in English.` +
      '\nAlt text is read aloud and indexed, so translate it in Content > Files.' +
      '\ncheck-translations.mjs cannot see it — it lives on the file, not the metaobject.',
  );
}

if (tally.failed) process.exitCode = 1;
