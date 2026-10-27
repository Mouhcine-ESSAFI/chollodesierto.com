// RETIRED — nothing in the app imports this any more. Content now goes through
// context.storefront.query(); see app/lib/admin-queries.ts. Kept only because it
// is not yet committed to git; safe to delete once it is.
//
// Historical note — Admin API content reads, only because the Storefront API is
// unavailable on this dev store (no active paid plan, PUBLIC_STOREFRONT_API_TOKEN
// is empty). Swap back to context.storefront.query(...) once a real Storefront
// token exists. See app/lib/queries.ts for the original Storefront queries —
// they are kept deliberately, this file exists alongside them.
//
// SERVER ONLY. Never import this from a component — the Admin token must never
// reach a client bundle. Call it from loaders/actions only.
//
// NOTE: this deviates from the usual `process.env` pattern on purpose. Hydrogen
// runs in a worker where `process` only exists at build time (see env.d.ts), so
// the env has to come from the loader's `context.env`.

const API_VERSION = '2025-01';

export type AdminEnv = {
  // The scripts in scripts/ set SHOPIFY_STORE_DOMAIN inline; .env only defines
  // PUBLIC_STORE_DOMAIN. Accept either — the domain is not a secret.
  SHOPIFY_STORE_DOMAIN?: string;
  PUBLIC_STORE_DOMAIN?: string;
  SHOPIFY_ADMIN_ACCESS_TOKEN?: string;
};

export async function adminQuery<T = unknown>(
  env: AdminEnv,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const store = env?.SHOPIFY_STORE_DOMAIN || env?.PUBLIC_STORE_DOMAIN;
  const token = env?.SHOPIFY_ADMIN_ACCESS_TOKEN;
  if (!store || !token) {
    throw new Error(
      'Missing store domain (SHOPIFY_STORE_DOMAIN or PUBLIC_STORE_DOMAIN) or SHOPIFY_ADMIN_ACCESS_TOKEN',
    );
  }

  const res = await fetch(`https://${store}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({query, variables}),
  });

  const json = (await res.json()) as {data?: T; errors?: unknown};
  if (json.errors) {
    throw new Error(JSON.stringify(json.errors));
  }
  return json.data as T;
}
