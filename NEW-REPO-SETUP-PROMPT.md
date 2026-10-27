# Prompt for Claude Code in the new repo

Copy everything below the line into Claude Code, running in the **new**
repository. Delete this file from the new repo once the work is done.

---

You are working in a fresh clone of a Shopify Hydrogen (React Router 7)
storefront. The code came from a sibling store and still points at that old
store in several places. Your job is to repoint it cleanly at the new store
and verify it works. Do not translate anything — the owner does that in
Shopify Admin.

## The two stores

| | Old (source, DO NOT TOUCH) | New (this repo) |
|---|---|---|
| Admin domain | `chollodesierto-tgxewfi3.myshopify.com` | `budgetdeserttour.myshopify.com` |
| Public domain | chollodesierto.com | budgetdeserttour.com |

The new store's Shopify data is **already fully populated** — 13 metaobject
definitions, 3 products with 13 variants, 24 files, 116 metaobject entries,
256 `ui_string` entries, 6 journal posts, both menus. Do not re-run the
migration scripts. The only remaining work is in this repo.

## Hard rules

1. **Never write to the old store.** Scripts here resolve their target via
   `scripts/store-env.mjs`: they use the `NEW_STORE_DOMAIN` /
   `NEW_ADMIN_ACCESS_TOKEN` pair when it is set, otherwise `SHOPIFY_*`. In
   this repo `NEW_*` must be **absent**, so everything targets the new store
   through `SHOPIFY_*`. If you ever see `NEW_*` in `.env` here, stop and ask.
2. **Never commit `.env` or `.env.production.local`.** They hold Admin tokens.
   Confirm both are gitignored before any commit.
3. **Never print a token value** in your output, not even partially.
4. **Do not change visible UI structure** — layout, sections, fields, copy —
   without asking first. If something looks missing, list it and ask. This is
   a standing instruction from the owner.
5. All user-facing text comes from Shopify via `useT()` / `ui_string`. Never
   hardcode a new visible string; add it to `scripts/organize-schema.mjs` and
   run that script.

## Tasks

### 1. Clean `.env`

It was copied from the old store. End state — exactly these keys:

```
PUBLIC_STORE_DOMAIN            # budgetdeserttour.myshopify.com
PUBLIC_STOREFRONT_API_TOKEN    # from the new store's Headless channel
PUBLIC_STOREFRONT_ID           # from the new store's Headless channel
PUBLIC_CHECKOUT_DOMAIN         # the new store's checkout domain
SESSION_SECRET                 # generate a NEW random value, do not reuse
SHOPIFY_STORE_DOMAIN           # budgetdeserttour.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN     # the new store's custom-app token
```

Remove:
- `NEW_STORE_DOMAIN` and `NEW_ADMIN_ACCESS_TOKEN` — cross-store migration
  only, and leaving them here makes scripts ambiguous.
- `SHOPIFY_HYDROGEN_DEPLOYMENT_TOKEN` — this store deploys from GitHub, so
  Oxygen injects it as a repo secret. A stale token here is just a liability.

Ask the owner for any value you do not have. Do not invent placeholders and do
not carry an old-store value forward.

### 2. Delete leftovers from the old store

These are gitignored, so they only exist if the project was copied rather than
`git clone`d. Check and remove:

- `.env.production.local` — contains the **old** store's storefront
  credentials. Either delete it or rewrite it with the new store's values.
- `h2_deploy_log.json` — old Oxygen deployment record, contains an auth
  bypass token.
- `.shopify/` — CLI state linked to the old store.

Then confirm `git status` is clean and `git check-ignore .env
.env.production.local` lists both.

### 3. Repoint the variant ids

```bash
node scripts/sync-variant-ids.mjs            # shows the diff
node scripts/sync-variant-ids.mjs --apply
```

This rewrites 13 `gid://shopify/ProductVariant/...` values in
`app/components/BookingBody.tsx` by matching product handle + option values
against the live store. They currently point at the **old** store, so checkout
is broken until this runs. Commit the result.

### 4. Two small code edits

- `vite.config.ts` — `allowedHosts` lists `chollodesierto.com`,
  `www.chollodesierto.com` and an unrelated `sslip.io` host. Replace with
  `budgetdeserttour.com` and `www.budgetdeserttour.com`, keeping `localhost`
  and `127.0.0.1`.
- `package.json` — `"name": "chollodesierto2"` → something matching this
  store.

Then search the repo for any other `chollodesierto` reference and report what
you find. Expect: English `t()` fallbacks and an SVG asset filename, both of
which are fine to leave — the fallbacks are overridden by Shopify and the
owner will translate them in Admin.

### 5. Verify

```bash
npm install
node scripts/check-ui-strings.mjs      # expect: no MISSING
node scripts/check-translations.mjs    # expect: 591 fields, ~0% translated
npm run dev
```

Load `/`, `/booking`, `/contact`, `/faq`, `/reviews`, `/blog` and confirm each
renders with real content and images.

Then confirm the Storefront API can see the products:

```bash
node -e "const e=Object.fromEntries(require('fs').readFileSync('.env','utf8').split(/\r?\n/).map(l=>l.split('=')).filter(p=>p[1]));fetch('https://'+e.PUBLIC_STORE_DOMAIN+'/api/2025-04/graphql.json',{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Storefront-Access-Token':e.PUBLIC_STOREFRONT_API_TOKEN},body:JSON.stringify({query:'{products(first:10){nodes{handle}}}'})}).then(r=>r.json()).then(j=>console.log(j.data.products.nodes.map(p=>p.handle)))"
```

Expect all three handles. **An empty array means the products are not
published to the Headless sales channel** — tell the owner to tick it in
Admin. Do not try to work around it in code.

## Three traps that make a broken store look fine

1. **English fallbacks hide missing data.** Every `t()` call has an English
   default and most components carry English fallback data, so a field that
   failed to load renders as perfectly good English with no error.
   `app/components/Journey.tsx` is the sharpest case: its hardcoded fallback
   days carry the *same titles* as the real Shopify entries, so the itinerary
   looks identical whether the data loaded or not. To prove content is live,
   change a value in Admin and watch the page follow — about 10 seconds,
   Hydrogen caches storefront queries briefly. Never conclude it from reading
   the source.
2. **Shopify caps metaobject queries at 250 per page.** `ui_string` has 256
   entries. Any query you write must paginate or it will silently drop the
   newest entries and report them as missing.
3. **The Admin API does not answer on a custom domain.**
   `budgetdeserttour.com` returns a bare `{"errors":"Not Found"}` that reads
   like a missing record. Always use the `.myshopify.com` domain for Admin
   calls.

## Known, already reported — do not fix without asking

- Store currency is **MAD**, so prices read as `85 MAD` rather than `€85`.
  If the owner switches the store to EUR, the fix is to re-run
  `migrate-products.mjs --apply` **from the old repo**, not to change code.
- Store timezone is `America/New_York`; the old store uses
  `Africa/Casablanca`.
- `site_settings` has empty `whatsapp_url`, `instagram_url` and `tiktok_url`,
  so the contact page renders disabled buttons by design.
- The contact form has no backend and its submit button is deliberately
  disabled.
- Terms and Refund policies are unpublished, so the footer's `#terms` and
  `#refund` are dead anchors.

## Finish

Report what you changed, what you verified and how, and anything you could not
verify. Then stop — the owner handles deployment (GitHub → Oxygen) and
translation.
