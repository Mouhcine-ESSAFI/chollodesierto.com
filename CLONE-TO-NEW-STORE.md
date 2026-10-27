# Cloning this storefront to a new Shopify store

For setting up the Spanish store as a **separate repository** with its own
Oxygen deployment. The theme and the code are identical; only the content a
visitor reads is translated.

## What is and isn't translated

| | Language |
|---|---|
| `ui_string` → `value` field | **Translated** |
| `page_section` headings, subheadings, body, labels | **Translated** |
| FAQ questions and answers, reviews, route and camp descriptions, itinerary days | **Translated** |
| File alt text | **Translated** |
| Metaobject type names, field keys, entry handles | English, always |
| `ui_string` → `key`, `label`, `note`, `group` | English, always |
| Product handles, blog handle, catalogue handles in `site_settings` | English, always |

Keys and handles are how the code finds content. Translating one breaks the
page silently, so they stay English on every store.

## The short version

Both phases run from **this** repo, with `NEW_*` in `.env` naming the new
store. You do not need the new repo until it is time to deploy.

```bash
node scripts/clone-store.mjs --phase source --dry-run
node scripts/clone-store.mjs --phase source

node scripts/clone-store.mjs --phase target --dry-run
node scripts/clone-store.mjs --phase target
```

`clone-store.mjs` runs every step below in order, checks the preflight first,
and stops at the first failure with the command to resume from. Add
`--dry-run` to see the plan without touching anything, `--from N` to resume,
`--only N` to run a single step.

Every script resolves its store the same way — the `NEW_*` pair when it is
set, otherwise `SHOPIFY_*` — so the target phase also works from the new repo
once that exists, where the new store is simply `SHOPIFY_*`. The preflight
compares the store it would write to against the one recorded in
`data/en-baseline.json` and refuses if they match, so a misconfigured run
cannot quietly rewrite the source store.

The phases stay separate because the source phase must finish exporting
before the target phase consumes those files.

The rest of this document is what those steps do, in case one fails.

## Before you start

On the new Shopify store, create a custom app with:
`write_metaobjects`, `read_metaobjects`,
**`write_metaobject_definitions`, `read_metaobject_definitions`**,
`write_products`, `read_products`, `write_content`, `read_content`,
`write_files`, `read_files`, `write_online_store_navigation`,
`read_publications`.

> The two **`_definitions`** scopes are separate from `read/write_metaobjects`
> and are easy to miss — the entry scopes do not imply them. Without them
> `metaobjectDefinitions` returns `ACCESS_DENIED` and the clone fails at
> step 1 before creating anything.

Check what a token actually has:

```bash
node -e "const e=Object.fromEntries(require('fs').readFileSync('.env','utf8').split(/\r?\n/).map(l=>l.split('=')).filter(p=>p[1]));fetch('https://'+e.NEW_STORE_DOMAIN+'/admin/oauth/access_scopes.json',{headers:{'X-Shopify-Access-Token':e.NEW_ADMIN_ACCESS_TOKEN}}).then(r=>r.json()).then(j=>console.log(j.access_scopes.map(s=>s.handle).join('\n')))"
```

You need **two checkouts**: the existing repo (the English source) and the new
one. Steps 1–3 run from the old repo, everything after from the new one.

In the **old** repo's `.env`, add the target alongside the existing values:

```
NEW_STORE_DOMAIN=<new-store>.myshopify.com
NEW_ADMIN_ACCESS_TOKEN=<token>
```

> **`NEW_STORE_DOMAIN` must be the `.myshopify.com` domain**, not the
> customer-facing one. The Admin API does not answer on a custom domain — it
> returns a bare `{"errors":"Not Found"}` that reads like a missing record
> rather than a wrong host. The scripts now reject it up front with a clear
> message, but it is the easiest mistake to make here.
>
> Set both variables or neither. Setting one pairs a credential with the
> wrong store.

In the **new** repo's `.env`, the new store is simply the normal store — set
`SHOPIFY_STORE_DOMAIN` and `SHOPIFY_ADMIN_ACCESS_TOKEN` to it, and leave
`NEW_*` unset. Every script except the two `migrate-*` ones targets
`SHOPIFY_*`, so this keeps the rest of the run unambiguous.

---

## 1. Definitions — from the old repo

```bash
node scripts/migrate-definitions.mjs            # dry run
node scripts/migrate-definitions.mjs --apply
```

Re-exports live from the source store, so it is always current. Every
definition is created with storefront access `PUBLIC_READ` — without it the
Storefront API returns zero entries **with no error**, which is a long
afternoon of debugging.

## 2. Products — from the old repo

```bash
node scripts/migrate-products.mjs --apply
```

Upserts by handle, so re-running fixes prices and options in place rather than
creating duplicates. Check the currency on the new store before you trust the
prices, then re-run.

## 3. Export content and files — from the old repo

```bash
node scripts/export-metaobjects.mjs
```

Writes `data/metaobject-entries.json` (116 entries across 12 types) and
`data/metaobject-files.json` (11 files). Every reference is portable —
`ref:metaobject/<type>/<handle>`, `ref:product/<handle>`, `ref:file/<filename>`
— because raw gids point at nothing, or at something unrelated, on another
store.

`ui_string` is deliberately excluded; step 6 creates those from code.

**Copy both JSON files into the new repo** before continuing.

## 3b. Product images — from the old repo

```bash
node scripts/migrate-product-media.mjs --export
```

`migrate-products.mjs` carries no media, and the storefront reads
`featuredImage` and variant `image`. Without this the booking page's add-on
cards are blank. Writes `data/product-media.json`: 13 images, 3 variant
assignments.

## 4. Files — from the new repo

```bash
node scripts/migrate-files.mjs --dry-run
node scripts/migrate-files.mjs
```

Downloads each image from the source store's public CDN URL and uploads it to
the target, keeping the filename and alt text. Filenames are the only
identifier a file keeps across stores, so **do not rename them** — step 5
resolves `ref:file/<filename>` by exact name.

Run this *before* step 5. An entry that references a file which isn't there
yet fails with a message telling you to come back here.

## 4b. Product images — from the new repo

```bash
node scripts/migrate-product-media.mjs --dry-run
node scripts/migrate-product-media.mjs
```

Shopify ingests the source store's public CDN URLs directly, so the bytes
never pass through your machine. Variant images are assigned after the media
reaches `READY` — pointing a variant at media that is still `PROCESSING` fails
as an unhelpful "media not found".

## 5. Metaobject entries — from the new repo

```bash
node scripts/create-metaobject-entries.mjs
```

Creates types in dependency order, computed from the data. Idempotent by
handle — and it has to be, because Shopify does **not** reject a duplicate
handle, it appends `-1` and makes a second entry.

## 6. UI strings — from the new repo

```bash
node scripts/organize-schema.mjs
node scripts/check-ui-strings.mjs
```

Creates all 258 strings with the English text, grouped and labelled. It never
overwrites a `value` that already exists, so it is safe to re-run after
translation has started. `check-ui-strings` should report no MISSING.

## 7. Catalogue handles — from the new repo

```bash
node scripts/add-handle-settings.mjs
```

Adds `tour_product_handle`, `quad_product_handle`, `transfer_product_handle`
and `journey_route_handle` to `site_settings` and verifies each one resolves
before writing it. If the new store uses different product handles, edit the
values in Admin afterwards — no code change needed.

Also check `blog_handle`: `node scripts/add-blog-handle-setting.mjs`.

## 8. Variant ids — from the new repo

```bash
node scripts/sync-variant-ids.mjs            # shows the diff
node scripts/sync-variant-ids.mjs --apply
```

Rewrites the 13 `ProductVariant` gids in `app/components/BookingBody.tsx` to
match the new store, matching by product handle and option values. **This edits
source**, which is why the two stores need separate repositories. Commit the
result.

## 9. Menus and blog — from the new repo

```bash
node scripts/migrate-menus.mjs --apply
node scripts/create-journal-posts.mjs
```

## 10. Check what still needs translating

```bash
node scripts/check-translations.mjs
```

Copy `data/en-baseline.json` from the old repo first — that is the English
reference it diffs against. It reports, per metaobject type, how many fields
are translated, still English, or missing. **591 translatable fields across 13
types**; expect 0% on the first run.

Re-run it as translation progresses. Use `--all` to list every outstanding
field.

Refresh the baseline with `--export` (from the old repo) whenever English
content changes, or the report will drift.

## 10b. Publish the products to the Headless channel

Nothing scripts this. In Admin, open each of the three products and confirm
the **Headless / Hydrogen** sales channel is ticked under Publishing.

If the Storefront API returns zero products, this is why — and the site will
render with its English fallback data, which looks like a working page.

Check it:

```bash
node -e "const e=Object.fromEntries(require('fs').readFileSync('.env','utf8').split(/\r?\n/).map(l=>l.split('=')).filter(p=>p[1]));fetch('https://'+e.PUBLIC_STORE_DOMAIN+'/api/2025-04/graphql.json',{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Storefront-Access-Token':e.PUBLIC_STOREFRONT_API_TOKEN},body:JSON.stringify({query:'{products(first:10){nodes{handle}}}'})}).then(r=>r.json()).then(j=>console.log(j.data.products.nodes.map(p=>p.handle)))"
```

Expect all three handles. An empty array means they are not published.

## 11. Deploying from GitHub

Oxygen can deploy on push, which is simpler than the token-based
`shopify hydrogen deploy` used on the first store.

1. Push the new repo to GitHub first — the connect flow needs a repo that
   already exists.
2. In Shopify Admin, open the **Hydrogen** (Headless) channel → your
   storefront → **Deployments** → connect to GitHub, and authorise the repo
   and branch.
3. Shopify commits a workflow file (`.github/workflows/oxygen-deployment-*.yml`)
   and adds the Oxygen deployment token to the repo as a secret. You do not
   create either by hand.
4. `git pull` so your local copy has the workflow file.
5. Every push to the linked branch now builds and deploys. Watch it under the
   repo's **Actions** tab.

Set the storefront's environment variables in the Hydrogen channel rather than
committing them: `SESSION_SECRET`, `PUBLIC_STOREFRONT_API_TOKEN`,
`PUBLIC_STORE_DOMAIN`, `PUBLIC_STOREFRONT_ID`, `PUBLIC_CHECKOUT_DOMAIN`. The
build reads them from Oxygen, not from `.env`, which is local-only.

**Never commit `.env`.** It holds the Admin token, and on this repo it now
also holds `NEW_ADMIN_ACCESS_TOKEN`. Confirm it is still gitignored in the new
repo before the first push.

## 12. Translate

Translation happens entirely in Shopify Admin — Content → Metaobjects. Nothing
in this repo changes.

Alt text is a separate job in Content → Files; `check-translations` cannot see
it, because it lives on the file rather than on the metaobject.

---

## Two things that will mislead you

**A section with no data looks completely normal.** Every `t()` call carries an
English default and most components carry English fallback data, so an unfilled
or failed field renders as good English with no error anywhere. `Journey.tsx`
is the sharpest example: its hardcoded fallback days carry the *same titles* as
the real Shopify entries, so the itinerary looks identical whether the data
loaded or not.

To prove content is live, change the value in Admin and watch the page follow
(about 10 seconds — Hydrogen caches storefront queries briefly). Never conclude
it from reading the source.

**Shopify caps metaobject queries at 250 per page.** `ui_string` is past that.
Any script you write against this store must paginate, or it will silently drop
the newest entries and report them as missing.
