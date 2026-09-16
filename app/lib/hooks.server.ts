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

const DEMO_CITIES = [
  "New York",
  "London",
  "Toronto",
  "Sydney",
  "Berlin",
  "Dubai",
  "Karachi",
  "Lahore",
  "Manchester",
  "Chicago",
];

/**
 * Turns a shop's saved settings into the list of hooks to render for one
 * product view. Every number here is randomly generated (seeded so it's
 * stable within an hour) — this is the only place that should decide "is
 * this hook shown, and what does it say," so keep the storefront JS and
 * the liquid block dumb and keep this function the single source of truth.
 */
export function computeHooks(input: ComputeHooksInput): RenderedHook[] {
  const { settings, seed } = input;
  const out: RenderedHook[] = [];

  if (settings.lowStockEnabled) {
    const maxN = Math.max(1, settings.lowStockThreshold);
    const count = randomInt(1, maxN, seed + 1);
    const phrasing = pick(
      [`Only ${count} left in stock`, `Just ${count} remaining`],
      seed + 1,
    );
    out.push({ id: "lowStock" as HookId, icon: "🔥", text: phrasing });
  } else if (settings.readyToShipEnabled) {
    out.push({
      id: "readyToShip" as HookId,
      icon: "✅",
      text: "In stock — ready to ship",
    });
  }

  if (settings.saleCountdownEnabled && settings.saleEndsAt) {
    const endsAt = new Date(settings.saleEndsAt);
    if (endsAt.getTime() > Date.now()) {
      out.push({
        id: "saleCountdown" as HookId,
        icon: "⏰",
        // The storefront widget renders the live countdown from
        // data-ends-at; this text is the no-JS / initial-paint fallback.
        text: `${settings.saleMessage} ${endsAt.toISOString()}`,
      });
    }
  }

  if (settings.freeShippingEnabled) {
    out.push({
      id: "freeShipping" as HookId,
      icon: "🚚",
      text: settings.freeShippingMessage,
    });
  }

  const soldCount = randomInt(2, 18, seed + 5);
  if (settings.soldRecentlyEnabled) {
    out.push({
      id: "soldRecently" as HookId,
      icon: "⚡",
      text: `${soldCount} sold in the last 24 hours`,
    });
  }

  if (settings.sellingFastEnabled && soldCount >= settings.sellingFastThreshold) {
    out.push({ id: "sellingFast" as HookId, icon: "📈", text: "Selling fast" });
  }

  if (settings.recentPurchaseEnabled) {
    const mins = randomInt(2, 55, seed + 2);
    const city = pick(DEMO_CITIES, seed + 6);
    const text = pick(
      [
        `Someone in ${city} bought this ${mins} minutes ago`,
        `Someone bought this ${mins} minutes ago`,
      ],
      seed + 2,
    );
    out.push({ id: "recentPurchase" as HookId, icon: "🛒", text });
  }

  if (settings.viewerCountEnabled) {
    const count = 3 + Math.floor(seededRandom(seed + 3) * 20); // 3-22
    out.push({
      id: "viewerCount" as HookId,
      icon: "👀",
      text: `${count} people viewing this now`,
    });
  }

  if (settings.wishlistCountEnabled) {
    const count = 2 + Math.floor(seededRandom(seed + 4) * 30); // 2-31
    out.push({
      id: "wishlistCount" as HookId,
      icon: "❤️",
      text: `${count} people added this to their wishlist`,
    });
  }

  return out;
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
