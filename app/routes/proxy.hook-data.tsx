// Storefront-facing data endpoint, reached through Shopify's App Proxy at
// https://{shop}/apps/hooks/hook-data?product_id=...&variant_id=...
// (the /apps/hooks prefix/subpath is configured in shopify.app.toml
// [app_proxy] — Shopify signs and forwards the request to /proxy/hook-data
// on this server). authenticate.public.appProxy verifies that signature,
// so there is no separate auth check needed here.
//
// This is the one route in the app that has NOT been run against a real
// request yet — App Proxy signature verification only happens on a real
// request from a real storefront, so treat the authenticate.public.appProxy
// call below as needing a live smoke test (open a product page on your dev
// store once the extension is installed) before trusting it in front of a
// paying merchant.
//
// No Admin API calls happen here on purpose: every hook number is
// randomly generated (see app/lib/hooks.server.ts), so this endpoint only
// needs the merchant's saved settings, not live inventory or order data.
import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { computeHooks, seedFromProductId } from "../lib/hooks.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);

  if (!session) {
    // No offline session for this shop (app was likely uninstalled but the
    // theme block is still on the page). Render nothing rather than error.
    return Response.json({ hooks: [] });
  }

  const url = new URL(request.url);
  const productGid = url.searchParams.get("product_id"); // numeric id, e.g. "8123456789"

  if (!productGid) {
    return Response.json({ hooks: [] }, { status: 400 });
  }

  const settings = await db.hookSettings.upsert({
    where: { shop: session.shop },
    update: {},
    create: { shop: session.shop },
  });

  const hooks = computeHooks({
    settings,
    seed: seedFromProductId(productGid),
  });

  return Response.json(
    { hooks },
    { headers: { "Cache-Control": "no-store" } },
  );
};
