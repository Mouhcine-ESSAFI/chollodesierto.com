const API_VERSION = "2025-01";
const STORE = process.env.SHOPIFY_STORE_DOMAIN;
const TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const ENDPOINT = `https://${STORE}/admin/api/${API_VERSION}/graphql.json`;
const PRODUCT_HANDLE = "3-day-sahara-tour";
const RENAME_MAP = { Standard: "Shared Camp", Comfort: "Comfort Camp", Premium: "Superior Camp" };

async function shopifyGraphQL(query, variables) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": TOKEN },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors, null, 2));
  return json.data;
}

const GET_PRODUCT_OPTIONS = `
  query GetProduct($handle: String!) {
    productByHandle(handle: $handle) {
      id
      options { id name optionValues { id name } }
    }
  }
`;

const UPDATE_OPTION = `
  mutation UpdateOption($productId: ID!, $option: OptionUpdateInput!, $optionValuesToUpdate: [OptionValueUpdateInput!]) {
    productOptionUpdate(productId: $productId, option: $option, optionValuesToUpdate: $optionValuesToUpdate) {
      product { id options { name optionValues { name } } }
      userErrors { field message }
    }
  }
`;

async function main() {
  const data = await shopifyGraphQL(GET_PRODUCT_OPTIONS, { handle: PRODUCT_HANDLE });
  const product = data.productByHandle;
  const campOption = product.options.find((o) => o.name === "Camp Tier");
  const optionValuesToUpdate = campOption.optionValues
    .filter((v) => RENAME_MAP[v.name])
    .map((v) => ({ id: v.id, name: RENAME_MAP[v.name] }));
  const result = await shopifyGraphQL(UPDATE_OPTION, {
    productId: product.id, option: { id: campOption.id }, optionValuesToUpdate,
  });
  console.log(JSON.stringify(result.productOptionUpdate.product.options, null, 2));
}
main().catch((err) => { console.error(err); process.exit(1); });
