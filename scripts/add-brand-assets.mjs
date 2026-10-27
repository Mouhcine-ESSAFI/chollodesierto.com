/**
 * Makes the logo and favicon editable from Admin.
 *
 * Both were bundled Vite assets imported straight into the components, so the
 * only way to change them was a commit and a deploy — and a cloned store
 * silently rendered the source store's wordmark.
 *
 * Adds `logo` and `favicon` to site_settings, uploads the SVGs currently in
 * app/assets, and points the fields at them. Appearance does not change; the
 * images just come from Shopify now.
 *
 *   node scripts/add-brand-assets.mjs --dry-run
 *   node scripts/add-brand-assets.mjs
 *   node scripts/add-brand-assets.mjs --fields-only   # define, upload nothing
 *
 * Targets the NEW_* store when that pair is set, otherwise SHOPIFY_*.
 *
 * `--fields-only` is for a second store: it gets the fields but keeps them
 * empty, so the owner uploads their own brand rather than inheriting another
 * store's. The components fall back to the bundled SVG until they do.
 *
 * The fields accept any file type, not images only: Shopify stores an SVG as
 * a GenericFile rather than a MediaImage, and an image-restricted field
 * rejects it.
 */
import {readFileSync, existsSync} from 'fs';
import {resolveStore, adminClient} from './store-env.mjs';

const DRY = process.argv.includes('--dry-run');
const FIELDS_ONLY = process.argv.includes('--fields-only');
// Without --source this follows the usual rule and targets NEW_* when set.
const SOURCE = process.argv.includes('--source');

const store = resolveStore({preferNew: !SOURCE});
const gql = adminClient(store);
const STORE = store.domain;

function check(result, label) {
  const errs = result.userErrors ?? result.mediaUserErrors ?? [];
  if (errs.length) throw new Error(`${label}: ${JSON.stringify(errs)}`);
  return result;
}

const ASSETS = [
  {
    key: 'logo',
    name: 'Logo',
    description:
      'The wordmark in the header and footer. SVG or PNG with a transparent background, around 40px tall. Leave empty to use the logo built into the theme.',
    file: 'app/assets/chollodesierto.svg',
    alt: 'Brand logo',
  },
  {
    key: 'favicon',
    name: 'Favicon',
    description:
      'The small icon in the browser tab. A square SVG or PNG. Leave empty to use the one built into the theme.',
    file: 'app/assets/favicon.svg',
    alt: 'Site favicon',
  },
];

// ── 1. Definition ───────────────────────────────────────────────────────────
const def = (
  await gql(`query { metaobjectDefinitionByType(type: "site_settings") {
    id fieldDefinitions { key } } }`)
).metaobjectDefinitionByType;
if (!def) throw new Error(`no site_settings definition on ${STORE}`);

const have = new Set(def.fieldDefinitions.map((f) => f.key));
const toCreate = ASSETS.filter((a) => !have.has(a.key));

if (!toCreate.length) {
  console.log('logo and favicon already on the site_settings definition');
} else if (DRY) {
  console.log(`[dry-run] would add: ${toCreate.map((a) => a.key).join(', ')}`);
} else {
  check(
    (
      await gql(
        `mutation U($id: ID!, $d: MetaobjectDefinitionUpdateInput!) {
           metaobjectDefinitionUpdate(id: $id, definition: $d) {
             userErrors { field message } } }`,
        {
          id: def.id,
          d: {
            fieldDefinitions: toCreate.map((a) => ({
              create: {
                key: a.key,
                name: a.name,
                type: 'file_reference',
                description: a.description,
                required: false,
              },
            })),
          },
        },
      )
    ).metaobjectDefinitionUpdate,
    'metaobjectDefinitionUpdate',
  );
  console.log(`added to definition: ${toCreate.map((a) => a.key).join(', ')}`);
}

if (FIELDS_ONLY) {
  console.log('\n--fields-only: nothing uploaded. Set the logo in');
  console.log('Admin > Content > Metaobjects > Site Settings.');
} else {
  // ── 2. Upload, skipping anything already there ────────────────────────────
  const entry = (
    await gql(`query { metaobjects(type: "site_settings", first: 1) {
      nodes { id fields { key value } } } }`)
  ).metaobjects.nodes[0];
  if (!entry) throw new Error(`no site_settings entry on ${STORE}`);
  const current = Object.fromEntries(entry.fields.map((f) => [f.key, f.value]));

  const mimeOf = (p) =>
    p.endsWith('.svg') ? 'image/svg+xml' : p.endsWith('.png') ? 'image/png' : 'image/jpeg';

  async function findFile(filename) {
    const d = await gql(
      `query F($q: String!) { files(first: 20, query: $q) {
         nodes { __typename
           ... on MediaImage { id image { url } }
           ... on GenericFile { id url } } } }`,
      {q: `filename:${filename}`},
    );
    const nameOf = (n) =>
      decodeURIComponent((n.image?.url ?? n.url ?? '').split('?')[0].split('/').pop() ?? '');
    return d.files.nodes.find((n) => nameOf(n) === filename) ?? null;
  }

  async function upload(path, alt) {
    const filename = path.split('/').pop();
    const existing = await findFile(filename);
    if (existing) {
      console.log(`  = ${filename} already on the store`);
      return existing.id;
    }
    const bytes = readFileSync(path);
    const mimeType = mimeOf(path);
    const staged = check(
      (
        await gql(
          `mutation S($input: [StagedUploadInput!]!) {
             stagedUploadsCreate(input: $input) {
               stagedTargets { url resourceUrl parameters { name value } }
               userErrors { field message } } }`,
          {
            input: [
              {filename, mimeType, resource: 'FILE', httpMethod: 'POST', fileSize: String(bytes.length)},
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
    if (!up.ok) throw new Error(`byte upload failed: HTTP ${up.status}`);

    const created = check(
      (
        await gql(
          `mutation F($files: [FileCreateInput!]!) {
             fileCreate(files: $files) {
               files { __typename ... on MediaImage { id } ... on GenericFile { id } }
               userErrors { field message } } }`,
          // SVG is a FILE, not an IMAGE — Shopify rejects it as IMAGE with an
          // "invalid mime type" that does not say why.
          {files: [{originalSource: staged.resourceUrl, contentType: 'FILE', alt}]},
        )
      ).fileCreate,
      'fileCreate',
    ).files[0];
    console.log(`  -> uploaded ${filename}`);
    return created.id;
  }

  const updates = [];
  for (const a of ASSETS) {
    if (current[a.key]) {
      console.log(`  = site_settings.${a.key} already set — left alone`);
      continue;
    }
    if (!existsSync(a.file)) {
      console.error(`  ! ${a.file} not found — skipped`);
      continue;
    }
    if (DRY) {
      console.log(`  [dry-run] would upload ${a.file} and set site_settings.${a.key}`);
      continue;
    }
    updates.push({key: a.key, value: await upload(a.file, a.alt)});
  }

  if (updates.length) {
    check(
      (
        await gql(
          `mutation U($id: ID!, $m: MetaobjectUpdateInput!) {
             metaobjectUpdate(id: $id, metaobject: $m) { userErrors { field message } } }`,
          {id: entry.id, m: {fields: updates}},
        )
      ).metaobjectUpdate,
      'metaobjectUpdate',
    );
    console.log(`set: ${updates.map((u) => u.key).join(', ')}`);
  }
}

console.log(`\ndone on ${STORE}`);
