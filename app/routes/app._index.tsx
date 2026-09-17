// The merchant-facing settings screen — one toggle row per hook.
//
// Every row carries a badge naming where that hook's number actually comes
// from, pulled from HOOK_DEFINITIONS in app/lib/hooks.ts. That isn't
// decoration: this app only ships hooks backed by something true, and
// showing the merchant the source next to the switch is what keeps that
// promise visible. If a future hook has no honest answer to "where does
// this number come from", it doesn't belong on this screen.
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
import { HOOK_DEFINITIONS, type HookId } from "../lib/hooks";

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
      lowStockThreshold: Math.max(1, int("lowStockThreshold", 5)),
      readyToShipEnabled: bool("readyToShipEnabled"),
      saleCountdownEnabled: bool("saleCountdownEnabled"),
      saleEndsAt:
        saleEndsAt && !Number.isNaN(saleEndsAt.getTime()) ? saleEndsAt : null,
      saleMessage: str("saleMessage", "Sale ends in"),
      freeShippingEnabled: bool("freeShippingEnabled"),
      freeShippingMessage: str("freeShippingMessage", "Free shipping today"),
      viewerCountEnabled: bool("viewerCountEnabled"),
      maxHooks: Math.max(1, Math.min(5, int("maxHooks", 3))),
    },
  });

  return { ok: true };
};

export default function Index() {
  const { settings } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  // Local state only so the per-hook extra fields (threshold, message, end
  // date) can appear and disappear with their switch.
  const [enabled, setEnabled] = useState<Record<HookId, boolean>>({
    lowStock: settings.lowStockEnabled,
    readyToShip: settings.readyToShipEnabled,
    saleCountdown: settings.saleCountdownEnabled,
    freeShipping: settings.freeShippingEnabled,
    viewerCount: settings.viewerCountEnabled,
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
          Every badge below is built from something real — your live
          inventory, a date you set, your own wording, or an actual count of
          people on the page. Nothing is invented, which is what keeps the
          app inside Shopify&apos;s rules and keeps your shoppers&apos; trust
          intact.
        </s-paragraph>

        <fetcher.Form method="post">
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="small">
              <s-text type="strong">Badges shown per product</s-text>
              <s-text color="subdued">
                Switch on as many hooks as you like — this is the most that
                will ever appear on a single product page at once. The
                strongest ones win, and the mix varies a little between
                products. Three or fewer keeps it believable.
              </s-text>
              <s-number-field
                name="maxHooks"
                label="Maximum badges"
                defaultValue={String(settings.maxHooks)}
                min={1}
                max={5}
              />
            </s-stack>
          </s-box>

          <s-box paddingBlockStart="base">
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
                        <s-badge tone="success">{def.source}</s-badge>
                      </s-stack>
                      <s-switch
                        name={`${def.id}Enabled`}
                        checked={enabled[def.id] || undefined}
                        onChange={() => toggle(def.id)}
                      />
                    </s-stack>

                    {def.id === "lowStock" && enabled.lowStock && (
                      <s-number-field
                        name="lowStockThreshold"
                        label="Show once real stock drops to or below"
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
                  </s-stack>
                </s-box>
              ))}
            </s-stack>
          </s-box>

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

      <s-section slot="aside" heading="Why some badges stay hidden">
        <s-paragraph>
          A badge is skipped whenever the real number behind it isn&apos;t
          there: the stock hooks stay hidden on products that don&apos;t
          track inventory, and the viewer count stays hidden until at least
          two people are on the page — one viewer is just the shopper
          themselves.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
