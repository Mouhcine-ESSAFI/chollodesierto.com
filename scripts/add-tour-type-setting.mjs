/**
 * Adds `tour_type` to site_settings.
 *
 * The JoyPlatform backend reads it as the `_tour_type` line-item property and
 * maps it to Private / Shared. It would normally come from the product's own
 * type, but this store's productType is "Tour", which the backend cannot
 * classify — so the storefront falls back to this field.
 *
 * Usage: node scripts/add-tour-type-setting.mjs [--dry-run] [--value Shared]
 */
import {readFileSync} from 'fs';

const DRY = process.argv.includes('--dry-run');
const vi = process.argv.indexOf('--value');
const VALUE = vi > -1 ? process.argv[vi + 1] : 'Shared';

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
const check = (p, label) => {
  const e = p?.userErrors ?? [];
  if (e.length) throw new Error(`${label}: ${JSON.stringify(e)}`);
  return p;
};

const def = (
  await gql(`query { metaobjectDefinitionByType(type: "site_settings") {
    id fieldDefinitions { key } } }`)
).metaobjectDefinitionByType;

if (!def.fieldDefinitions.some((f) => f.key === 'tour_type')) {
  if (DRY) {
    console.log('[dry-run] would add site_settings.tour_type');
  } else {
    const r = await gql(
      `mutation U($id: ID!, $d: MetaobjectDefinitionUpdateInput!) {
         metaobjectDefinitionUpdate(id: $id, definition: $d) {
           metaobjectDefinition { fieldDefinitions { key } }
           userErrors { field message } } }`,
      {
        id: def.id,
        d: {
          fieldDefinitions: [
            {
              create: {
                key: 'tour_type',
                name: 'Tour type (booking system)',
                type: 'single_line_text_field',
                description:
                  'Private or Shared. Sent to the booking system with every order. Leave as Shared unless you start selling private tours.',
                required: false,
                validations: [
                  {name: 'choices', value: JSON.stringify(['Private', 'Shared'])},
                ],
              },
            },
          ],
        },
      },
    );
    check(r.metaobjectDefinitionUpdate, 'tour_type field');
    console.log('added site_settings.tour_type');
  }
} else {
  console.log('site_settings.tour_type already exists');
}

const entry = (
  await gql(`query { metaobjects(type: "site_settings", first: 1) {
    nodes { id fields { key value } } } }`)
).metaobjects.nodes[0];
if (!entry) throw new Error('no site_settings entry');

const current = entry.fields.find((f) => f.key === 'tour_type')?.value;
if (current) {
  console.log(`tour_type already set to "${current}" — left alone`);
} else if (DRY) {
  console.log(`[dry-run] would set tour_type = ${VALUE}`);
} else {
  const r = await gql(
    `mutation U($id: ID!, $m: MetaobjectUpdateInput!) {
       metaobjectUpdate(id: $id, metaobject: $m) {
         metaobject { handle } userErrors { field message } } }`,
    {id: entry.id, m: {fields: [{key: 'tour_type', value: VALUE}]}},
  );
  check(r.metaobjectUpdate, 'tour_type value');
  console.log(`set tour_type = ${VALUE}`);
}
