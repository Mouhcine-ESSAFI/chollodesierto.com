// RETIRED — checkout is back on the Storefront cart (see app/routes/booking.tsx).
// Nothing imports this any more, and it would not work regardless: the current
// Admin token has no scopes. Kept only because it is not yet committed to git.
//
// Historical note — Draft Order checkout, used only because the Storefront API is
// unavailable on this store (development store with no active paid Shopify plan,
// and the Admin API has no Cart object). Swap back to context.cart.create() in
// app/routes/booking.tsx once PUBLIC_STOREFRONT_API_TOKEN works — the original
// implementation is preserved there, commented, under a DISABLED marker.
//
// SERVER ONLY. Never import this from a component: it carries the Admin token
// via adminQuery(). Call it from actions only.
//
// Requires the `write_draft_orders` Admin API scope.

import {adminQuery, type AdminEnv} from '~/lib/admin-query';

export const DRAFT_ORDER_CREATE = `
  mutation DraftOrderCreate($input: DraftOrderInput!) {
    draftOrderCreate(input: $input) {
      draftOrder {
        id
        invoiceUrl
      }
      userErrors { field message }
    }
  }
`;

export type BookingLine = {merchandiseId: string; quantity: number};

type DraftOrderCreateResponse = {
  draftOrderCreate: {
    draftOrder: {id: string; invoiceUrl: string | null} | null;
    userErrors: Array<{field: string[] | null; message: string}>;
  };
};

/**
 * Creates a Shopify draft order and returns its hosted invoice URL.
 * Draft orders take `variantId` per line item — the same ProductVariant gids the
 * booking form already builds for cart lines.
 */
export async function createDraftOrder(env: AdminEnv, lines: BookingLine[]) {
  const input = {
    lineItems: lines.map((l) => ({
      variantId: l.merchandiseId,
      quantity: l.quantity,
    })),
    // Booking specifics live in the note until the form collects contact and
    // pickup details — see the project's open item on this.
    note: 'Booking created via storefront — pending contact details.',
  };

  const res = await adminQuery<DraftOrderCreateResponse>(env, DRAFT_ORDER_CREATE, {
    input,
  });

  return res.draftOrderCreate;
}
