// Mandatory GDPR compliance webhook (customers/redact).
// Same reasoning as webhooks.customers.data_request.tsx: OrderEvent rows
// carry no customer identifier, so there is no per-customer record to
// delete here. Keep this in sync with that file if the data model changes.
import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`, payload);

  return new Response();
};
