/**
 * Publishes the starter journal posts from data/journal-posts.json.
 *
 * REQUIRES the `write_content` Admin scope, which this app does not currently
 * have — the script checks first and tells you exactly what to change rather
 * than failing halfway through. Add the scope in:
 *   Settings → Apps and sales channels → Develop apps → your app
 *   → Configuration → Admin API access scopes → tick write_content → Save
 *   → Install/Update, then copy the new token into .env.
 *
 * Idempotent: a post whose handle already exists is skipped, so you can add one
 * post to the JSON later and re-run without duplicating the rest.
 *
 * Posts are created oldest-first with publish dates a week apart, so the
 * journal's Featured slot lands on the last one in the file.
 *
 * Usage: node scripts/create-journal-posts.mjs [--dry-run] [--author "Name"]
 */
import {readFileSync} from 'fs';
import {resolveStore} from './store-env.mjs';

const DRY = process.argv.includes('--dry-run');
const authorArg = process.argv.indexOf('--author');
const AUTHOR = authorArg > -1 ? process.argv[authorArg + 1] : 'Chollodesierto';

// Acts on the NEW_* store when that pair is set, so a clone can be driven
// from this repo without editing .env.
const {domain: STORE, token: TOKEN} = resolveStore({preferNew: true});

/** Shopify's own clock, captured from a response header. See shopifyNow(). */
let serverNow = null;

async function admin(query, variables) {
  const r = await fetch(`https://${STORE}/admin/api/2025-01/graphql.json`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN},
    body: JSON.stringify({query, variables}),
  });
  const d = r.headers.get('date');
  if (d) serverNow = new Date(d);
  const j = await r.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors));
  return j.data;
}

/**
 * "Now" according to Shopify, not to this machine.
 *
 * Publish dates are validated against Shopify's clock, and a local clock that
 * runs ahead makes every "now" look like a future date — which Shopify refuses
 * alongside isPublished. Taking the base time from its own Date header removes
 * the dependency on the local clock being right.
 */
function shopifyNow() {
  if (!serverNow) throw new Error('no Shopify timestamp seen yet');
  return serverNow.getTime();
}

/**
 * These reads used to go through the Storefront API. They go through Admin
 * now, because on a clone the storefront token in .env belongs to the OLD
 * store — the queries would quietly describe the wrong one. The token has
 * read_content and read_metaobjects, and these queries have the same shape on
 * both APIs.
 */
const storefront = admin;

// ── 0. Fail early and clearly if the scope is missing ───────────────────────
const scopeRes = await fetch(`https://${STORE}/admin/oauth/access_scopes.json`, {
  headers: {'X-Shopify-Access-Token': TOKEN},
});
const scopes = scopeRes.ok
  ? ((await scopeRes.json()).access_scopes ?? []).map((s) => s.handle)
  : [];
if (!scopes.includes('write_content')) {
  console.error('This token cannot create blog posts.');
  console.error(`  has:    ${scopes.join(', ') || '(could not read scopes)'}`);
  console.error('  needs:  write_content');
  console.error('\nAdd it in Settings → Apps and sales channels → Develop apps →');
  console.error('your app → Configuration → Admin API access scopes → write_content,');
  console.error('then Save, Install/Update, and put the new token in .env.');
  process.exitCode = 1;
  throw new Error('missing write_content scope');
}

// ── 1. Find the blog the site reads ─────────────────────────────────────────
const configuredHandle = (
  await storefront(`query { metaobjects(type: "site_settings", first: 1) {
     nodes { fields { key value } } } }`)
).metaobjects.nodes[0]?.fields.find((f) => f.key === 'blog_handle')?.value;

const blogs = (await admin(`query { blogs(first: 20) { nodes { id handle title } } }`)).blogs.nodes;
const blog =
  blogs.find((b) => b.handle === configuredHandle) ?? blogs[0];
if (!blog) throw new Error('this store has no blog — create one in Content → Blog posts');
console.log(`blog: "${blog.title}" (${blog.handle})`);

const existing = new Set(
  (
    await admin(
      `query B($id: ID!) { blog(id: $id) { articles(first: 250) { nodes { handle } } } }`,
      {id: blog.id},
    )
  ).blog.articles.nodes.map((a) => a.handle),
);
console.log(`already published: ${existing.size}`);

// ── 2. Images — reuse what is already in the store so cards aren't blank ────
const mediaUrls = [];
for (const type of ['gallery_item', 'camp_tier', 'tour_route']) {
  const d = await storefront(
    `query { metaobjects(type: "${type}", first: 50) {
       nodes { fields { key reference { ... on MediaImage { image { url } } } } } } }`,
  );
  for (const n of d.metaobjects.nodes) {
    for (const f of n.fields) {
      const url = f?.reference?.image?.url;
      if (url && !mediaUrls.includes(url)) mediaUrls.push(url);
    }
  }
}
console.log(`reusable images in the store: ${mediaUrls.length}`);

// ── 3. Create ───────────────────────────────────────────────────────────────
const {posts} = JSON.parse(readFileSync('data/journal-posts.json', 'utf8'));

const CREATE = `mutation A($article: ArticleCreateInput!) {
  articleCreate(article: $article) {
    article { id handle title }
    userErrors { field message }
  }
}`;

let created = 0;
let skipped = 0;

posts.forEach; // (kept sequential below so publish dates stay ordered)
for (const [i, post] of posts.entries()) {
  if (existing.has(post.handle)) {
    console.log(`skip    ${post.handle} (already published)`);
    skipped++;
    continue;
  }

  // Oldest first, a week apart, ending a minute before Shopify's own "now" —
  // so the last entry in the file is the newest post, and therefore the
  // journal's Featured card.
  const daysBack = (posts.length - 1 - i) * 7;
  const publishDate = new Date(
    shopifyNow() - daysBack * 86400000 - 60000,
  ).toISOString();

  const article = {
    blogId: blog.id,
    title: post.title,
    handle: post.handle,
    body: post.body,
    summary: post.summary,
    tags: post.tags ?? [],
    author: {name: post.author ?? AUTHOR},
    isPublished: true,
    publishDate,
  };

  const imageUrl = post.imageUrl ?? mediaUrls[i % (mediaUrls.length || 1)];
  if (imageUrl) article.image = {url: imageUrl, altText: post.imageAlt ?? post.title};

  if (DRY) {
    console.log(
      `[dry-run] create ${post.handle}  tag=${(post.tags ?? []).join('/')}  published=${publishDate.slice(0, 10)}  image=${imageUrl ? 'yes' : 'no'}`,
    );
    created++;
    continue;
  }

  const r = await admin(CREATE, {article});
  const errs = r.articleCreate.userErrors;
  if (errs.length) throw new Error(`${post.handle}: ${JSON.stringify(errs)}`);
  const got = r.articleCreate.article;
  if (got.handle !== post.handle) {
    // Shopify suffixes a clashing handle rather than failing, which would leave
    // a post at a URL nothing links to.
    throw new Error(`handle drift: asked ${post.handle}, got ${got.handle}`);
  }
  console.log(`create  ${got.handle}  "${got.title.slice(0, 48)}"`);
  created++;
}

console.log(`\ncreated ${created}, skipped ${skipped}`);

if (!DRY && created) {
  // Admin's `blog` takes an id, not a handle, and calls the excerpt `summary`.
  const back = await admin(
    `query B($id: ID!) { blog(id: $id) {
       articles(first: 50) { nodes { handle title tags summary image { url } } } } }`,
    {id: blog.id},
  );
  const arts = back.blog?.articles?.nodes ?? [];
  console.log(`\nverify — storefront now sees ${arts.length} published post(s):`);
  for (const a of arts) {
    const gaps = [
      a.excerpt ? null : 'excerpt',
      a.image?.url ? null : 'image',
      a.tags?.length ? null : 'tag',
    ].filter(Boolean);
    console.log(`  ${a.handle.padEnd(30)} ${gaps.length ? 'missing ' + gaps.join(', ') : 'complete'}`);
  }
}
