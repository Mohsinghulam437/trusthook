// The merchant-facing settings screen — one toggle row per hook, matching
// the layout you sketched. Every row also carries the honesty disclosure
// for that hook (real data vs. estimate) pulled from HOOK_DEFINITIONS in
// app/lib/hooks.server.ts, so the "simulated" label can never drift out of
// sync between this screen and what actually renders on the storefront.
import { useEffect, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { HOOK_DEFINITIONS, type HookId } from "../lib/hooks.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const settings = await db.hookSettings.upsert({
    where: { shop: session.shop },
    update: {},
    create: { shop: session.shop },
  });

  return { settings };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const bool = (name: string) => formData.get(name) === "on";
  const int = (name: string, fallback: number) => {
    const raw = formData.get(name);
    const parsed = raw ? parseInt(String(raw), 10) : NaN;
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const str = (name: string, fallback: string) =>
    (formData.get(name)?.toString() ?? "").trim() || fallback;

  const saleEndsAtRaw = formData.get("saleEndsAt")?.toString();
  const saleEndsAt = saleEndsAtRaw ? new Date(saleEndsAtRaw) : null;

  await db.hookSettings.update({
    where: { shop: session.shop },
    data: {
      lowStockEnabled: bool("lowStockEnabled"),
      lowStockThreshold: int("lowStockThreshold", 5),
      readyToShipEnabled: bool("readyToShipEnabled"),
      saleCountdownEnabled: bool("saleCountdownEnabled"),
      saleEndsAt: saleEndsAt && !Number.isNaN(saleEndsAt.getTime()) ? saleEndsAt : null,
      saleMessage: str("saleMessage", "Sale ends in"),
      freeShippingEnabled: bool("freeShippingEnabled"),
      freeShippingMessage: str("freeShippingMessage", "Free shipping today"),
      soldRecentlyEnabled: bool("soldRecentlyEnabled"),
      sellingFastEnabled: bool("sellingFastEnabled"),
      sellingFastThreshold: int("sellingFastThreshold", 10),
      recentPurchaseEnabled: bool("recentPurchaseEnabled"),
      recentPurchaseDemoMode: bool("recentPurchaseDemoMode"),
      viewerCountEnabled: bool("viewerCountEnabled"),
      wishlistCountEnabled: bool("wishlistCountEnabled"),
    },
  });

  return { ok: true };
};

const DISCLOSURE_LABEL: Record<string, string> = {
  real: "Real data",
  "real-or-demo": "Real data, with optional demo mode",
  simulated: "Estimated — not real-time data",
};

export default function Index() {
  const { settings } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  // Local, uncontrolled-ish state just to enable/disable the sub-fields
  // (threshold, message, end date) that only make sense when a hook is on.
  const [enabled, setEnabled] = useState<Record<HookId, boolean>>({
    lowStock: settings.lowStockEnabled,
    readyToShip: settings.readyToShipEnabled,
    saleCountdown: settings.saleCountdownEnabled,
    freeShipping: settings.freeShippingEnabled,
    soldRecently: settings.soldRecentlyEnabled,
    sellingFast: settings.sellingFastEnabled,
    recentPurchase: settings.recentPurchaseEnabled,
    viewerCount: settings.viewerCountEnabled,
    wishlistCount: settings.wishlistCountEnabled,
  });

  const isSaving = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data?.ok) {
      shopify.toast.show("Hook settings saved");
    }
  }, [fetcher.data, shopify]);

  const toggle = (id: HookId) =>
    setEnabled((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <s-page heading="Hooks">
      <s-section heading="Product page hooks">
        <s-paragraph>
          Turn on the hooks you want to show on product pages. Each one
          states whether it&apos;s built from your store&apos;s real data or
          is an estimate — that label also appears in the storefront
          widget&apos;s settings so you always know what a shopper is
          seeing.
        </s-paragraph>

        <fetcher.Form method="post">
          <s-stack direction="block" gap="base">
            {HOOK_DEFINITIONS.map((def) => (
              <s-box
                key={def.id}
                padding="base"
                borderWidth="base"
                borderRadius="base"
              >
                <s-stack direction="block" gap="small">
                  <s-stack direction="inline" gap="base">
                    <s-text>{def.icon}</s-text>
                    <s-stack direction="block" gap="none">
                      <s-text type="strong">{def.label}</s-text>
                      <s-text color="subdued">{def.helpText}</s-text>
                      <s-badge tone={def.dataSource === "simulated" ? "warning" : "success"}>
                        {DISCLOSURE_LABEL[def.dataSource]}
                      </s-badge>
                    </s-stack>
                    <s-switch
                      name={`${def.id}Enabled`}
                      checked={enabled[def.id] || undefined}
                      onChange={() => toggle(def.id)}
                    />
                  </s-stack>

                  {/* Per-hook extra settings, shown only while the hook is on. */}
                  {def.id === "lowStock" && enabled.lowStock && (
                    <s-number-field
                      name="lowStockThreshold"
                      label="Show when quantity is at or below"
                      defaultValue={String(settings.lowStockThreshold)}
                      min={1}
                    />
                  )}

                  {def.id === "saleCountdown" && enabled.saleCountdown && (
                    <s-stack direction="inline" gap="base">
                      <s-date-field
                        name="saleEndsAt"
                        label="Sale ends at"
                        defaultValue={
                          settings.saleEndsAt
                            ? new Date(settings.saleEndsAt)
                                .toISOString()
                                .slice(0, 10)
                            : undefined
                        }
                      />
                      <s-text-field
                        name="saleMessage"
                        label="Message prefix"
                        defaultValue={settings.saleMessage}
                      />
                    </s-stack>
                  )}

                  {def.id === "freeShipping" && enabled.freeShipping && (
                    <s-text-field
                      name="freeShippingMessage"
                      label="Message"
                      defaultValue={settings.freeShippingMessage}
                    />
                  )}

                  {def.id === "sellingFast" && enabled.sellingFast && (
                    <s-number-field
                      name="sellingFastThreshold"
                      label="Show once 24h sales reach"
                      defaultValue={String(settings.sellingFastThreshold)}
                      min={1}
                    />
                  )}

                  {def.id === "recentPurchase" && enabled.recentPurchase && (
                    <s-stack direction="inline" gap="base">
                      <s-switch
                        name="recentPurchaseDemoMode"
                        label="Demo mode for stores with no recent orders (always shown as an example)"
                        defaultChecked={settings.recentPurchaseDemoMode || undefined}
                      />
                    </s-stack>
                  )}
                </s-stack>
              </s-box>
            ))}
          </s-stack>

          <s-box paddingBlockStart="base">
            <s-button
              variant="primary"
              type="submit"
              {...(isSaving ? { loading: true } : {})}
            >
              Save
            </s-button>
          </s-box>
        </fetcher.Form>
      </s-section>

      <s-section slot="aside" heading="Storefront setup">
        <s-paragraph>
          Settings here only control what CAN show. To make hooks appear on
          product pages, add the &quot;Hooks&quot; app block to your product
          template from the theme editor (Online Store → Themes → Customize
          → Product page → Add block).
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
