// Feeds "sold in the last 24 hours", "selling fast", and "someone just
// bought this". Subscribed to orders/paid (not orders/create) so we only
// log orders that actually completed payment — a created-but-unpaid order
// should never count as a "sale" in a scarcity widget.
//
// Payload shape here is Shopify's standard REST order webhook JSON: an
// order with line_items[] (each carrying product_id) and an optional
// shipping_address. This has NOT been exercised against a live order yet
// — verify the field names below against a real test order once the app
// is connected to a dev store (Settings → Notifications → send a test
// webhook, or place a real test order), since a malformed payload here
// would silently under-count sales rather than error loudly.
import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

interface OrderPaidLineItem {
  product_id?: number | string | null;
}

interface OrderPaidPayload {
  line_items?: OrderPaidLineItem[];
  shipping_address?: {
    city?: string | null;
    province?: string | null;
  } | null;
  created_at?: string;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  const order = payload as OrderPaidPayload;
  const lineItems = order.line_items ?? [];
  const city = order.shipping_address?.city ?? null;
  const region = order.shipping_address?.province ?? null;
  const occurredAt = order.created_at ? new Date(order.created_at) : new Date();

  const uniqueProductIds = Array.from(
    new Set(
      lineItems
        .map((item) => item.product_id)
        .filter((id): id is number | string => id !== null && id !== undefined)
        .map((id) => String(id)),
    ),
  );

  if (uniqueProductIds.length > 0) {
    await db.orderEvent.createMany({
      data: uniqueProductIds.map((productId) => ({
        shop,
        productId,
        city,
        region,
        occurredAt,
      })),
    });
  }

  return new Response();
};
