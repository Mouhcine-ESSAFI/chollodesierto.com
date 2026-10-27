/**
 * Adds `blog_handle` to site_settings and points it at the blog that actually
 * exists in this store.
 *
 * The code used to hardcode the blog handle "news", which no store here has —
 * so the journal silently showed its empty state. The handle now comes from
 * Admin, with a fall back to the first blog the storefront can see, so a second
 * store works whatever its blog is called.
 *
 * Usage: node scripts/add-blog-handle-setting.mjs [--dry-run]
 */
import {resolveStore} from './store-env.mjs';

const DRY = process.argv.includes('--dry-run');

// Acts on the NEW_* store when that pair is set, so a clone can be driven
// from this repo without editing .env.
const {domain: STORE, token: TOKEN} = resolveStore({preferNew: true});

async function admin(query, variables) {
  const r = await fetch(`https://${STORE}/admin/api/2025-01/graphql.json`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN},
    body: JSON.stringify({query, variables}),
  });
  const j = await r.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors));
  return j.data;
}

// Read via Admin, not the Storefront API. The Admin `blogs` field needs
// read_content, which the token lacked when this was written — it has it now.
// That matters for a clone: the storefront token in .env belongs to the OLD
// store, so a storefront call here would list the wrong store's blogs.
const blogs = (
  await admin(`query { blogs(first: 20) { nodes { handle title articles(first: 1) { nodes { handle } } } } }`)
).blogs.nodes;

if (!blogs.length) throw new Error('this store has no blog — create one in Content > Blog posts');
console.log('blogs on this store:');
for (const b of blogs) {
  console.log(`  ${b.handle.padEnd(18)} "${b.title}"  has articles: ${b.articles.nodes.length > 0}`);
}
// Prefer a blog that actually has posts.
const target = blogs.find((b) => b.articles.nodes.length) ?? blogs[0];
console.log(`\nusing: ${target.handle}`);

const def = (
  await admin(`query { metaobjectDefinitionByType(type: "site_settings") {
    id fieldDefinitions { key } } }`)
).metaobjectDefinitionByType;

if (!def.fieldDefinitions.some((f) => f.key === 'blog_handle')) {
  if (DRY) {
    console.log('[dry-run] would add site_settings.blog_handle');
  } else {
    const r = await admin(
      `mutation U($id: ID!, $d: MetaobjectDefinitionUpdateInput!) {
         metaobjectDefinitionUpdate(id: $id, definition: $d) {
           metaobjectDefinition { fieldDefinitions { key } } userErrors { field message } } }`,
      {
        id: def.id,
        d: {
          fieldDefinitions: [
            {
              create: {
                key: 'blog_handle',
                name: 'Journal blog handle',
                type: 'single_line_text_field',
                description:
                  'Which Shopify blog feeds the Journal page. Find it in Content › Blog posts › Manage blogs. Leave blank to use the first blog.',
                required: false,
              },
            },
          ],
        },
      },
    );
    const errs = r.metaobjectDefinitionUpdate.userErrors;
    if (errs.length) throw new Error(JSON.stringify(errs));
    console.log('added site_settings.blog_handle');
  }
} else {
  console.log('site_settings.blog_handle already exists');
}

const entry = (
  await admin(`query { metaobjects(type: "site_settings", first: 1) {
    nodes { id handle fields { key value } } } }`)
).metaobjects.nodes[0];
if (!entry) throw new Error('no site_settings entry');

const current = entry.fields.find((f) => f.key === 'blog_handle')?.value;
// "Already set" is not good enough on a cloned store: site_settings carries
// the SOURCE store's blog handle, which names a blog that does not exist
// here, and the journal would render its empty state. Keep an existing value
// only when it actually resolves.
const currentResolves = current && blogs.some((b) => b.handle === current);
if (current && !currentResolves) {
  console.log(`blog_handle is "${current}", which is not a blog on this store — replacing`);
}
if (currentResolves) {
  console.log(`blog_handle already set to "${current}" — left alone`);
} else if (DRY) {
  console.log(`[dry-run] would set blog_handle = ${target.handle}`);
} else {
  const r = await admin(
    `mutation U($id: ID!, $m: MetaobjectUpdateInput!) {
       metaobjectUpdate(id: $id, metaobject: $m) {
         metaobject { handle } userErrors { field message } } }`,
    {id: entry.id, m: {fields: [{key: 'blog_handle', value: target.handle}]}},
  );
  const errs = r.metaobjectUpdate.userErrors;
  if (errs.length) throw new Error(JSON.stringify(errs));
  console.log(`set blog_handle = ${target.handle}`);
}
