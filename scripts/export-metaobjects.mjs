/**
 * Exports the live store's metaobject entries to data/metaobject-entries.json,
 * plus the list of files they reference to data/metaobject-files.json.
 *
 * This is the missing half of create-metaobject-entries.mjs, which could only
 * ever read that file — so it drifted months behind the store and nothing
 * noticed.
 *
 *   node scripts/export-metaobjects.mjs                      # all content types
 *   node scripts/export-metaobjects.mjs --include-ui-strings # add the 258 strings
 *   node scripts/export-metaobjects.mjs page_section         # one type
 *
 * Reads SHOPIFY_STORE_DOMAIN / SHOPIFY_ADMIN_ACCESS_TOKEN (the source store).
 *
 * Every reference is written in portable form, because raw gids differ per
 * store and point at nothing — or worse, at something unrelated — after a move:
 *
 *   ref:metaobject/<type>/<handle>
 *   ref:product/<handle>
 *   ref:file/<filename>
 *
 * ui_string is skipped by default. organize-schema.mjs builds all 258 entries
 * from its in-code catalogue, and having them here too would mean two sources
 * of truth that quietly disagree.
 */
import {readFileSync, writeFileSync, existsSync, mkdirSync} from 'fs';

const args = process.argv.slice(2);
const INCLUDE_UI = args.includes('--include-ui-strings');
const ONLY_TYPE = args.find((a) => !a.startsWith('--'));

const env = {};
for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const STORE = process.env.SHOPIFY_STORE_DOMAIN || env.SHOPIFY_STORE_DOMAIN;
const TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || env.SHOPIFY_ADMIN_ACCESS_TOKEN;
if (!STORE || !TOKEN) {
  throw new Error('Set SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN in .env');
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

const REF_SELECTION = `
  __typename
  ... on Metaobject { type handle }
  ... on Product { handle }
  ... on MediaImage { id alt image { url } }
  ... on GenericFile { id alt url }
  ... on Video { id alt filename }
`;

const ENTRIES_QUERY = `
  query Entries($type: String!, $after: String) {
    metaobjects(type: $type, first: 100, after: $after) {
      nodes {
        handle
        fields {
          key
          value
          type
          reference { ${REF_SELECTION} }
          references(first: 50) { nodes { ${REF_SELECTION} } }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

/** Files keyed by filename, so the same image referenced twice uploads once. */
const files = new Map();

/** Shopify serves files as .../files/<name>?v=123 — the name is the stable id. */
function filenameOf(url) {
  return decodeURIComponent(url.split('?')[0].split('/').pop() ?? '');
}

function toPortableRef(node) {
  switch (node.__typename) {
    case 'Metaobject':
      return `ref:metaobject/${node.type}/${node.handle}`;
    case 'Product':
      return `ref:product/${node.handle}`;
    case 'MediaImage':
    case 'GenericFile':
    case 'Video': {
      const url = node.image?.url ?? node.url ?? node.sources?.[0]?.url ?? '';
      const name = node.filename || filenameOf(url);
      if (!name) {
        console.warn(`  ! ${node.__typename} ${node.id} has no resolvable filename — skipped`);
        return null;
      }
      const prev = files.get(name);
      if (prev && prev.url !== url) {
        console.warn(`  ! two different files are both named "${name}" — the clone will get one of them`);
      }
      files.set(name, {
        filename: name,
        url,
        alt: node.alt ?? '',
        kind: node.__typename,
      });
      return `ref:file/${name}`;
    }
    default:
      console.warn(`  ! unhandled reference type ${node.__typename} — left as a raw value`);
      return null;
  }
}

function fieldValue(field) {
  const isList = field.type?.startsWith('list.');
  const isRef = /_reference$/.test(field.type ?? '') || /_reference$/.test((field.type ?? '').replace('list.', ''));

  if (isRef && isList) {
    const refs = (field.references?.nodes ?? []).map(toPortableRef).filter(Boolean);
    return refs.length ? refs : null;
  }
  if (isRef) {
    return field.reference ? toPortableRef(field.reference) : null;
  }
  return field.value;
}

async function exportType(type) {
  const entries = [];
  let after = null;
  do {
    const d = await gql(ENTRIES_QUERY, {type, after});
    for (const node of d.metaobjects.nodes) {
      const fields = {};
      for (const f of node.fields) {
        if (!f.value) continue;
        const v = fieldValue(f);
        if (v !== null && v !== undefined && v !== '') fields[f.key] = v;
      }
      entries.push({handle: node.handle, fields});
    }
    after = d.metaobjects.pageInfo.hasNextPage ? d.metaobjects.pageInfo.endCursor : null;
  } while (after);
  return entries;
}

const allTypes = (
  await gql(`query { metaobjectDefinitions(first: 50) { nodes { type } } }`)
).metaobjectDefinitions.nodes.map((n) => n.type);

let types = ONLY_TYPE ? [ONLY_TYPE] : allTypes;
if (!ONLY_TYPE && !INCLUDE_UI) types = types.filter((t) => t !== 'ui_string');

if (ONLY_TYPE && !allTypes.includes(ONLY_TYPE)) {
  throw new Error(`No metaobject definition of type "${ONLY_TYPE}" on ${STORE}`);
}

console.log(`source: ${STORE}\n`);

const out = {};
for (const type of types) {
  out[type] = await exportType(type);
  console.log(`${type.padEnd(16)} ${String(out[type].length).padStart(4)} entries`);
}

if (!existsSync('data')) mkdirSync('data');

// A single-type run must not wipe the other types already in the file.
const ENTRIES_PATH = 'data/metaobject-entries.json';
let merged = out;
if (ONLY_TYPE && existsSync(ENTRIES_PATH)) {
  merged = {...JSON.parse(readFileSync(ENTRIES_PATH, 'utf8')), ...out};
}
writeFileSync(ENTRIES_PATH, JSON.stringify(merged, null, 2));

const fileList = [...files.values()].sort((a, b) => a.filename.localeCompare(b.filename));
writeFileSync('data/metaobject-files.json', JSON.stringify(fileList, null, 2));

const total = Object.values(out).reduce((n, e) => n + e.length, 0);
console.log(`\nwrote ${ENTRIES_PATH}         ${total} entries across ${types.length} types`);
console.log(`wrote data/metaobject-files.json   ${fileList.length} unique files`);
if (!INCLUDE_UI && !ONLY_TYPE) {
  console.log('\nui_string skipped — organize-schema.mjs creates those on the target store.');
}
