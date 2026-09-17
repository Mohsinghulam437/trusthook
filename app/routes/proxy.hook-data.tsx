// Storefront-facing data endpoint, reached through Shopify's App Proxy at
// https://{shop}/apps/hooks/hook-data?product_id=...&variant_id=...
// (the /apps/hooks prefix/subpath is configured in shopify.app.toml
// [app_proxy] — Shopify signs and forwards the request to /proxy/hook-data
// on this server). authenticate.public.appProxy verifies that signature,
// so there is no separate auth check needed here.
//
// This route does two real things before computing any badge:
//
//  1. Reads the product's actual inventory from the Admin API. If that
//     fails, or the product doesn't track inventory, the quantity stays
//     null and both stock hooks are skipped — never guessed.
//  2. Records this browser as currently viewing the product, then counts
//     how many distinct browsers viewed it in the last few minutes. That
//     count IS the "people viewing now" number; nothing is estimated.
//
// The visitor token comes from the storefront widget and lives in that
// tab's sessionStorage. It is random, it identifies no one, it is never
// joined to a customer, and rows are pruned within the hour — which is
// what keeps a genuinely live viewer count out of protected-customer-data
// territory.
import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { computeHooks, seedFromProductId } from "../lib/hooks.server";

/** A browser counts as "here now" if it loaded the page this recently. */
const VIEWER_WINDOW_MS = 5 * 60 * 1000;
/** Rows older than this are junk and get swept up. */
const VIEW_RETENTION_MS = 60 * 60 * 1000;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.public.appProxy(request);

  if (!session || !admin) {
    // No offline session for this shop (app was likely uninstalled but the
    // theme block is still on the page). Render nothing rather than error.
    return Response.json({ hooks: [] });
  }

  const url = new URL(request.url);
  const productId = url.searchParams.get("product_id"); // numeric id, e.g. "8123456789"
  const variantId = url.searchParams.get("variant_id");
  const visitorId = url.searchParams.get("visitor_id");

  if (!productId) {
    return Response.json({ hooks: [] }, { status: 400 });
  }

  const settings = await db.hookSettings.upsert({
    where: { shop: session.shop },
    update: {},
    create: { shop: session.shop },
  });

  // --- Real inventory ----------------------------------------------------
  // Stays null on any failure or when the product doesn't track inventory,
  // which makes both stock hooks silently skip rather than show a number
  // the store can't stand behind.
  let inventoryQuantity: number | null = null;
  try {
    if (variantId) {
      const response = await admin.graphql(
        `#graphql
        query VariantInventory($id: ID!) {
          productVariant(id: $id) {
            inventoryQuantity
            inventoryItem { tracked }
          }
        }`,
        { variables: { id: `gid://shopify/ProductVariant/${variantId}` } },
      );
      const json = await response.json();
      const variant = json?.data?.productVariant;
      if (variant?.inventoryItem?.tracked) {
        inventoryQuantity = variant.inventoryQuantity ?? null;
      }
    } else {
      const response = await admin.graphql(
        `#graphql
        query ProductInventory($id: ID!) {
          product(id: $id) {
            variants(first: 50) {
              nodes {
                inventoryQuantity
                inventoryItem { tracked }
              }
            }
          }
        }`,
        { variables: { id: `gid://shopify/Product/${productId}` } },
      );
      const json = await response.json();
      const nodes: Array<{
        inventoryQuantity: number | null;
        inventoryItem: { tracked: boolean } | null;
      }> = json?.data?.product?.variants?.nodes ?? [];
      const tracked = nodes.filter((n) => n.inventoryItem?.tracked);
      if (tracked.length > 0) {
        inventoryQuantity = tracked.reduce(
          (sum, n) => sum + (n.inventoryQuantity ?? 0),
          0,
        );
      }
    }
  } catch (error) {
    console.error("Failed to read inventory for hooks widget", error);
  }

  // --- Real viewer count -------------------------------------------------
  let viewerCount = 0;
  const now = Date.now();
  try {
    if (visitorId) {
      await db.productView.upsert({
        where: {
          shop_productId_visitorId: {
            shop: session.shop,
            productId,
            visitorId,
          },
        },
        update: { viewedAt: new Date(now) },
        create: { shop: session.shop, productId, visitorId },
      });
    }

    viewerCount = await db.productView.count({
      where: {
        shop: session.shop,
        productId,
        viewedAt: { gte: new Date(now - VIEWER_WINDOW_MS) },
      },
    });

    // Occasional sweep rather than one on every request — the table only
    // ever holds a few minutes of rows, so this is cheap either way.
    if (Math.random() < 0.05) {
      await db.productView.deleteMany({
        where: { viewedAt: { lt: new Date(now - VIEW_RETENTION_MS) } },
      });
    }
  } catch (error) {
    console.error("Failed to record or count product views", error);
    viewerCount = 0;
  }

  const hooks = computeHooks({
    settings,
    inventoryQuantity,
    viewerCount,
    seed: seedFromProductId(productId),
  });

  return Response.json(
    { hooks },
    { headers: { "Cache-Control": "no-store" } },
  );
};
