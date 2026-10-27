/**
 * Shared .env loading and store resolution for the clone scripts.
 *
 * Exists because two mistakes here are silent and expensive:
 *
 *  1. A custom domain in NEW_STORE_DOMAIN. The Admin API only answers on the
 *     <name>.myshopify.com domain — budgetdeserttour.com returns a bare
 *     {"errors":"Not Found"} that looks like a missing resource, not a wrong
 *     host.
 *  2. Half a credential pair. Resolving domain and token independently lets a
 *     new token get paired with the old domain, which fails as an
 *     authentication error against the wrong store.
 */
import {readFileSync} from 'fs';
import {fileURLToPath} from 'url';
import {dirname, join} from 'path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const KEYS = [
  'SHOPIFY_STORE_DOMAIN',
  'SHOPIFY_ADMIN_ACCESS_TOKEN',
  'NEW_STORE_DOMAIN',
  'NEW_ADMIN_ACCESS_TOKEN',
  'PUBLIC_STORE_DOMAIN',
  'PUBLIC_STOREFRONT_API_TOKEN',
  'PRIVATE_ADMIN_API_TOKEN',
];

export function loadEnv() {
  const env = {};
  try {
    for (const line of readFileSync(join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
    }
  } catch {
    // Absent .env is fine when the values come from the environment.
  }
  // A real environment variable wins, so a one-off run can point somewhere
  // else without editing .env.
  for (const k of KEYS) if (process.env[k]) env[k] = process.env[k].trim();
  return env;
}

function assertAdminDomain(domain, varName) {
  if (!/\.myshopify\.com$/.test(domain)) {
    throw new Error(
      `${varName}="${domain}" is not an Admin API domain.\n` +
        `Use the <name>.myshopify.com domain, not the customer-facing one.\n` +
        `Find it in Shopify Admin under Settings > Domains ("myshopify.com domain").`,
    );
  }
}

/**
 * Resolves which store to act on.
 *
 * `preferNew: true`  — the target of a migration. Uses the NEW_* pair when
 *                      both halves are present, otherwise SHOPIFY_*.
 * `preferNew: false` — always the SHOPIFY_* store (the source).
 */
export function resolveStore({preferNew = false, env = loadEnv()} = {}) {
  // `--source` on any script forces the SHOPIFY_* store. Without it the only
  // way to retarget was to edit .env, which is how a credential got deleted.
  if (process.argv.includes('--source')) preferNew = false;

  const newDomain = env.NEW_STORE_DOMAIN || '';
  const newToken = env.NEW_ADMIN_ACCESS_TOKEN || '';

  if (preferNew && (newDomain || newToken)) {
    if (!newDomain || !newToken) {
      throw new Error(
        'NEW_STORE_DOMAIN and NEW_ADMIN_ACCESS_TOKEN must both be set, or neither.\n' +
          'Setting only one pairs a credential with the wrong store.',
      );
    }
    assertAdminDomain(newDomain, 'NEW_STORE_DOMAIN');
    return {domain: newDomain, token: newToken, which: 'new', env};
  }

  const domain = env.SHOPIFY_STORE_DOMAIN || env.PUBLIC_STORE_DOMAIN || '';
  const token = env.SHOPIFY_ADMIN_ACCESS_TOKEN || env.PRIVATE_ADMIN_API_TOKEN || '';
  if (!domain || !token) {
    throw new Error('Set SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN in .env');
  }
  assertAdminDomain(domain, 'SHOPIFY_STORE_DOMAIN');
  return {domain, token, which: 'source', env};
}

/** An Admin GraphQL caller bound to one store. */
export function adminClient({domain, token}, apiVersion = '2025-01') {
  return async function gql(query, variables) {
    const r = await fetch(`https://${domain}/admin/api/${apiVersion}/graphql.json`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'X-Shopify-Access-Token': token},
      body: JSON.stringify({query, variables}),
    });
    const j = await r.json();
    if (j.errors) {
      const detail = typeof j.errors === 'string' ? j.errors : JSON.stringify(j.errors, null, 2);
      throw new Error(`Admin API ${r.status} on ${domain}: ${detail}`);
    }
    return j.data;
  };
}
