// The hook engine — server only.
//
// The registry itself (HOOK_DEFINITIONS, HookId, …) lives in ./hooks.ts
// because the merchant settings screen renders it in the browser. This
// file holds the part that must never reach the client bundle: the logic
// that decides what each shopper actually sees. Keep it that way — if a
// component needs something from here, move that something to ./hooks.ts
// rather than importing this file from a component (the production build
// fails outright on a server-only import reaching client code).

import type { HookSettings } from "@prisma/client";

import type { HookId, RenderedHook } from "./hooks";

export type { HookId, RenderedHook } from "./hooks";

export interface ComputeHooksInput {
  settings: HookSettings;
  /** A stable per-request seed (e.g. derived from product id + hour) so
   * simulated numbers and rotating copy don't flicker on every reload. */
  seed: number;
}

/** Deterministic 0..1 pseudo-random value from an integer seed (mulberry32). */
function seededRandom(seed: number): number {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function pick<T>(items: T[], seed: number): T {
  const idx = Math.floor(seededRandom(seed) * items.length) % items.length;
  return items[idx];
}

function randomInt(min: number, max: number, seed: number): number {
  return min + Math.floor(seededRandom(seed) * (max - min + 1));
}

/**
 * How strongly each hook earns its place when more are switched on than a
 * product page should show at once. The sale countdown outranks everything
 * because it's the only one tied to a real deadline the merchant set; the
 * reassurance hooks sit at the bottom because they're the least persuasive
 * and the easiest to lose without the page feeling emptier.
 */
const HOOK_WEIGHT: Record<HookId, number> = {
  saleCountdown: 100,
  lowStock: 80,
  freeShipping: 70,
  recentPurchase: 55,
  soldRecently: 50,
  viewerCount: 45,
  sellingFast: 40,
  wishlistCount: 30,
  readyToShip: 25,
};

/** Per-hook offsets so each one's jitter is independent of the others'. */
const HOOK_JITTER_SEED: Record<HookId, number> = {
  lowStock: 11,
  readyToShip: 22,
  saleCountdown: 33,
  freeShipping: 44,
  soldRecently: 55,
  sellingFast: 66,
  recentPurchase: 77,
  viewerCount: 88,
  wishlistCount: 99,
};

interface HookCandidate {
  hook: RenderedHook;
  score: number;
}

/**
 * Turns a shop's saved settings into the list of hooks to render for one
 * product view. Every number here is randomly generated (seeded so it's
 * stable within an hour) — this is the only place that should decide "is
 * this hook shown, and what does it say," so keep the storefront JS and
 * the liquid block dumb and keep this function the single source of truth.
 *
 * Note the two-step shape: build every hook the merchant switched on, then
 * keep only the best `settings.maxHooks` of them. A merchant who turns
 * everything on still gets a page that looks like a shop rather than a
 * billboard, and the seeded jitter means two products in the same store
 * don't show the identical stack of badges.
 */
export function computeHooks(input: ComputeHooksInput): RenderedHook[] {
  const { settings, seed } = input;
  const candidates: HookCandidate[] = [];

  const offer = (hook: RenderedHook) => {
    // Up to ±12 of wiggle, enough for neighbouring hooks to trade places
    // between products but not enough for a weak hook to beat a strong one.
    const jitter = (seededRandom(seed + HOOK_JITTER_SEED[hook.id]) - 0.5) * 24;
    candidates.push({ hook, score: HOOK_WEIGHT[hook.id] + jitter });
  };

  if (settings.lowStockEnabled) {
    const maxN = Math.max(1, settings.lowStockThreshold);
    const count = randomInt(1, maxN, seed + 1);
    const phrasing = pick(
      [`Only ${count} left in stock`, `Just ${count} remaining`],
      seed + 1,
    );
    offer({ id: "lowStock", icon: "🔥", text: phrasing });
  } else if (settings.readyToShipEnabled) {
    offer({
      id: "readyToShip",
      icon: "✅",
      text: "In stock — ready to ship",
    });
  }

  if (settings.saleCountdownEnabled && settings.saleEndsAt) {
    const endsAt = new Date(settings.saleEndsAt);
    if (endsAt.getTime() > Date.now()) {
      offer({
        id: "saleCountdown",
        icon: "⏰",
        // Only the merchant's own wording goes in `text`; the storefront
        // widget appends a live ticking clock built from `endsAt` and hides
        // the whole badge once the sale is over.
        text: settings.saleMessage,
        endsAt: endsAt.toISOString(),
      });
    }
  }

  if (settings.freeShippingEnabled) {
    offer({
      id: "freeShipping",
      icon: "🚚",
      text: settings.freeShippingMessage,
    });
  }

  const soldCount = randomInt(2, 18, seed + 5);
  if (settings.soldRecentlyEnabled) {
    offer({
      id: "soldRecently",
      icon: "⚡",
      text: `${soldCount} sold in the last 24 hours`,
    });
  }

  if (settings.sellingFastEnabled && soldCount >= settings.sellingFastThreshold) {
    offer({ id: "sellingFast", icon: "📈", text: "Selling fast" });
  }

  if (settings.recentPurchaseEnabled) {
    // No city or country names on purpose: this app is installed by stores
    // all over the world, and naming a place the shopper has no connection
    // to reads as obviously fake. Keep it location-free.
    const mins = randomInt(2, 55, seed + 2);
    const unit = mins === 1 ? "minute" : "minutes";
    const text = pick(
      [
        `Someone bought this ${mins} ${unit} ago`,
        `Last ordered ${mins} ${unit} ago`,
      ],
      seed + 2,
    );
    offer({ id: "recentPurchase", icon: "🛒", text });
  }

  if (settings.viewerCountEnabled) {
    const count = 3 + Math.floor(seededRandom(seed + 3) * 20); // 3-22
    offer({
      id: "viewerCount",
      icon: "👀",
      text: `${count} people viewing this now`,
    });
  }

  if (settings.wishlistCountEnabled) {
    const count = 2 + Math.floor(seededRandom(seed + 4) * 30); // 2-31
    offer({
      id: "wishlistCount",
      icon: "❤️",
      text: `${count} people added this to their wishlist`,
    });
  }

  const limit = Math.max(1, Math.min(9, settings.maxHooks));

  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((candidate) => candidate.hook);
}

/** Builds a stable per-hour seed from a product id so numbers don't
 * change on every page reload but do drift over the course of a day. */
export function seedFromProductId(productId: string): number {
  const hourBucket = Math.floor(Date.now() / (1000 * 60 * 60));
  let hash = hourBucket;
  for (let i = 0; i < productId.length; i++) {
    hash = (hash * 31 + productId.charCodeAt(i)) | 0;
  }
  return hash;
}
