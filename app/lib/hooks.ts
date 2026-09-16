// The hook registry — shared between the browser and the server.
//
// This file must stay free of any server-only imports (Prisma, node APIs,
// secrets). The merchant settings screen in app/routes/app._index.tsx
// renders from HOOK_DEFINITIONS in the browser, so anything it needs lives
// here; the actual hook-text generation lives in ./hooks.server.ts, which
// is server-only and never reaches the client bundle.
//
// Scope decision (deliberate, not an oversight): every number this app
// shows is randomly generated, seeded per-product-per-hour so it doesn't
// flicker on reload but does drift over the day. This app targets small/
// new stores that don't have enough real traffic or order history yet for
// "real" numbers to look convincing anyway — that's the whole point of it.
// No Shopify Admin API calls and no order webhooks are needed at all,
// which also means no "protected customer data" approval is required.
// Keep every generated range plausible (a handful of viewers, single-digit
// low-stock counts) rather than exaggerated — regulators in some markets
// (e.g. the US FTC) have specifically gone after fake urgency/scarcity
// claims that are wildly implausible, so "boring and believable" is the
// safer choice, not just the more honest one.

export type HookId =
  | "lowStock"
  | "readyToShip"
  | "saleCountdown"
  | "freeShipping"
  | "soldRecently"
  | "sellingFast"
  | "recentPurchase"
  | "viewerCount"
  | "wishlistCount";

export type HookDataSource = "real" | "simulated";

export interface HookDefinition {
  id: HookId;
  label: string;
  icon: string;
  dataSource: HookDataSource;
  /** Shown under the toggle on the settings page. */
  helpText: string;
}

export interface RenderedHook {
  id: HookId;
  icon: string;
  text: string;
  /**
   * ISO timestamp, only set for the sale countdown. The storefront widget
   * turns this into a live ticking countdown and hides the badge once it
   * passes; the server never sends a pre-formatted date, because a string
   * rendered on the server would freeze the moment the page was cached.
   */
  endsAt?: string;
}

export const HOOK_DEFINITIONS: HookDefinition[] = [
  {
    id: "lowStock",
    label: "Low stock warning",
    icon: "🔥",
    dataSource: "simulated",
    helpText:
      "Shows a randomly generated low-stock number (not your real inventory) — a believable urgency cue for stores still building up traffic.",
  },
  {
    id: "readyToShip",
    label: "In stock — ready to ship",
    icon: "✅",
    dataSource: "simulated",
    helpText: "A static reassurance message you can turn on any time.",
  },
  {
    id: "saleCountdown",
    label: "Sale countdown",
    icon: "⏰",
    dataSource: "real",
    helpText: "Counts down to a real end time you set below.",
  },
  {
    id: "freeShipping",
    label: "Free shipping today",
    icon: "🚚",
    dataSource: "real",
    helpText:
      "A static or scheduled message you control. Only turn this on for offers that are actually running — this is a shipping promise, not decoration.",
  },
  {
    id: "soldRecently",
    label: "Sold in the last 24 hours",
    icon: "⚡",
    dataSource: "simulated",
    helpText: "A randomly generated recent-sales count, not your real order data.",
  },
  {
    id: "sellingFast",
    label: "Selling fast",
    icon: "📈",
    dataSource: "simulated",
    helpText:
      "Shown once the random 24-hour count above crosses your threshold. No extra data needed once 'Sold in the last 24 hours' is on.",
  },
  {
    id: "recentPurchase",
    label: "Someone just bought this",
    icon: "🛒",
    dataSource: "simulated",
    helpText: "A randomly generated recent-purchase message, not a real order.",
  },
  {
    id: "viewerCount",
    label: "People viewing this right now",
    icon: "👀",
    dataSource: "simulated",
    helpText:
      "Estimated, not measured — Shopify has no built-in concurrent-viewer tracking.",
  },
  {
    id: "wishlistCount",
    label: "Wishlist adds",
    icon: "❤️",
    dataSource: "simulated",
    helpText:
      "Estimated — Shopify has no native wishlist feature, so this number is not tracking real saves.",
  },
];

export function getHookDefinition(id: HookId): HookDefinition {
  const def = HOOK_DEFINITIONS.find((h) => h.id === id);
  if (!def) throw new Error(`Unknown hook id: ${id}`);
  return def;
}
