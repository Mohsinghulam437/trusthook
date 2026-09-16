// Mandatory GDPR compliance webhook (shop/redact).
// Fires ~48 hours after a shop uninstalls, as the final signal to erase
// everything tied to that shop. Unlike the two customer-level webhooks,
// this one does have real cleanup work: delete the shop's HookSettings
// and OrderEvent rows. Session cleanup already happens on app/uninstalled
// (see webhooks.app.uninstalled.tsx); this is the second, delayed pass.
import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  await db.hookSettings.deleteMany({ where: { shop } });
  await db.orderEvent.deleteMany({ where: { shop } });

  return new Response();
};
