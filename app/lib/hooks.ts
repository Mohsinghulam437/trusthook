// The hook registry — shared between the browser and the server.
//
// This file must stay free of any server-only imports (Prisma, node APIs,
// secrets). The merchant settings screen in app/routes/app._index.tsx
// renders from HOOK_DEFINITIONS in the browser, so anything it needs lives
// here; the logic that decides what a shopper actually sees lives in
// ./hooks.server.ts, which never reaches the client bundle.
//
// THE RULE THIS FILE EXISTS TO PROTECT: every badge is backed by something
// true. Shopify's App Store requirements prohibit apps that "falsify data
// to deceive merchants or buyers, such as fake reviews or false purchase
// notifications," and an app that invents numbers can't be listed, which
// means it can't charge through Shopify either. So a hook belongs here only
// if there is a real source behind it:
//
//   - low stock / ready to ship  → the product's real inventory quantity
//   - sale countdown             → an end time the merchant set
//   - free shipping              → a message the merchant wrote
//   - people viewing now         → a real count of distinct browsers on
//                                  the page in the last few minutes
//
// Hooks that were deliberately cut because nothing real backs them yet:
// "sold in the last 24 hours" and "someone just bought this" (both need
// order access, which requires a protected-customer-data approval), and
// "wishlist adds" (would need an actual wishlist feature). Do not add them
// back with generated numbers.

export type HookId =
  | "lowStock"
  | "readyToShip"
  | "saleCountdown"
  | "freeShipping"
  | "viewerCount";

export interface HookDefinition {
  id: HookId;
  label: string;
  icon: string;
  /** Shown under the toggle on the settings page. */
  helpText: string;
  /** Where the number or claim comes from, shown to the merchant. */
  source: string;
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
    helpText:
      "Shows the real quantity left once it drops to your threshold. Hidden while stock is healthy, and hidden entirely if the product doesn't track inventory.",
    source: "Your real inventory",
  },
  {
    id: "readyToShip",
    label: "In stock — ready to ship",
    icon: "✅",
    helpText:
      "The reassuring opposite of low stock: shown only while the real quantity is above your threshold.",
    source: "Your real inventory",
  },
  {
    id: "saleCountdown",
    label: "Sale countdown",
    icon: "⏰",
    helpText:
      "Counts down to the end time you set below, and disappears by itself the moment the sale is over.",
    source: "The end time you set",
  },
  {
    id: "freeShipping",
    label: "Free shipping today",
    icon: "🚚",
    helpText:
      "Your own message. Only turn this on while the offer is actually running — it's a shipping promise your store has to keep.",
    source: "Your own message",
  },
  {
    id: "viewerCount",
    label: "People viewing this right now",
    icon: "👀",
    helpText:
      "A real count of how many different browsers have this product page open right now. Hidden when the shopper is the only one here, because '1 person viewing' is just them.",
    source: "Real live page views",
  },
];

export function getHookDefinition(id: HookId): HookDefinition {
  const def = HOOK_DEFINITIONS.find((h) => h.id === id);
  if (!def) throw new Error(`Unknown hook id: ${id}`);
  return def;
}
