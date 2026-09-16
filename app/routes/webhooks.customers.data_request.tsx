// Mandatory GDPR compliance webhook (customers/data_request).
// Shopify requires every public app to subscribe to this topic, whether or
// not the app stores customer-identifiable data. This app doesn't: the
// only order-derived data we keep (OrderEvent, in prisma/schema.prisma) is
// product id + coarse city/region, with no customer id, name, or order id
// attached, so there's nothing to look up or hand back per customer.
// If a future hook starts storing anything tied to a specific customer,
// this handler needs to actually fetch and return that data — do not
// leave this as a no-op once that's true.
import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`, payload);

  return new Response();
};
