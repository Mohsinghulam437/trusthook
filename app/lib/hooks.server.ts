// The hook engine — server only.
//
// The registry itself (HOOK_DEFINITIONS, HookId, …) lives in ./hooks.ts
// because the merchant settings screen renders it in the browser. This
// file holds the part that must never reach the client bundle: the logic
// that decides what each shopper actually sees. Keep it that way — if a
// component needs something from here, move that something to ./hooks.ts
// rather than importing this file from a component (the production build
// fails outright on a server-only import reaching client code).
//
// Nothing in here invents a number. Every value arrives as an argument,
// measured somewhere real: `inventoryQuantity` from Shopify's Admin API,
// `viewerCount` from rows this app wrote when browsers actually loaded the
// page. If a value is missing, the hook is omitted rather than guessed —
// that omission is the whole compliance story, so don't "helpfully" add a
// fallback number to any branch below.

import type { HookSettings } from "@prisma/client";

import type { HookId, RenderedHook } from "./hooks";

export type { HookId, RenderedHook } from "./hooks";

export interface ComputeHooksInput {
  settings: HookSettings;
  /**
   * Real quantity for the variant being viewed (or the product total when
   * no variant is specified). `null` means "unknown" — the product doesn't
   * track inventory, or the API call failed — and both inventory hooks are
   * skipped in that case.
   */
  inventoryQuantity: number | null;
  /** Distinct browsers with this product page open in the last few minutes. */
  viewerCount: number;
  /**
   * A stable per-product seed, used ONLY to vary wording and ordering —
   * never to produce a number a shopper reads as a fact.
   */
  seed: number;
}

/**
 * How strongly each hook earns its place when more are switched on than a
 * product page should show at once. The sale countdown outranks everything
 * because it's the only one tied to a deadline the merchant set; ready-to-
 * ship sits at the bottom because it's the least persuasive and the easiest
 * to lose without the page feeling emptier.
 */
const HOOK_WEIGHT: Record<HookId, number> = {
  saleCountdown: 100,
  lowStock: 80,
  freeShipping: 70,
  viewerCount: 45,
  readyToShip: 25,
};

/** Per-hook offsets so each one's jitter is independent of the others'. */
const HOOK_JITTER_SEED: Record<HookId, number> = {
  lowStock: 11,
  readyToShip: 22,
  saleCountdown: 33,
  freeShipping: 44,
  viewerCount: 55,
};

/**
 * Below this, the viewer count is not worth showing. One viewer is the
 * shopper themselves, and telling someone "1 person is viewing this" is
 * both useless and faintly absurd.
 */
const MIN_VIEWERS_TO_SHOW = 2;

interface HookCandidate {
  hook: RenderedHook;
  score: number;
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

/**
 * Turns a shop's saved settings plus real measurements into the list of
 * hooks to render for one product view. This is the only place that should
 * decide "is this hook shown, and what does it say," so keep the storefront
 * JS and the liquid block dumb.
 *
 * Two-step shape: build every hook that both the merchant switched on AND
 * has real data behind it, then keep only the best `settings.maxHooks` of
 * them. A merchant who turns everything on still gets a page that looks
 * like a shop rather than a billboard.
 */
export function computeHooks(input: ComputeHooksInput): RenderedHook[] {
  const { settings, inventoryQuantity, viewerCount, seed } = input;
  const candidates: HookCandidate[] = [];

  const offer = (hook: RenderedHook) => {
    // Up to ±12 of wiggle, enough for neighbouring hooks to trade places
    // between products but not enough for a weak hook to beat a strong one.
    const jitter = (seededRandom(seed + HOOK_JITTER_SEED[hook.id]) - 0.5) * 24;
    candidates.push({ hook, score: HOOK_WEIGHT[hook.id] + jitter });
  };

  const threshold = Math.max(1, settings.lowStockThreshold);
  const stock = inventoryQuantity;

  if (
    settings.lowStockEnabled &&
    stock !== null &&
    stock > 0 &&
    stock <= threshold
  ) {
    const phrasing = pick(
      [`Only ${stock} left in stock`, `Just ${stock} remaining`],
      seed + 1,
    );
    offer({ id: "lowStock", icon: "🔥", text: phrasing });
  }

  // Never both: one is the low-stock state, the other is its opposite.
  const showedLowStock = candidates.some((c) => c.hook.id === "lowStock");
  if (
    settings.readyToShipEnabled &&
    stock !== null &&
    !showedLowStock &&
    stock > threshold
  ) {
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

  if (settings.viewerCountEnabled && viewerCount >= MIN_VIEWERS_TO_SHOW) {
    offer({
      id: "viewerCount",
      icon: "👀",
      text: `${viewerCount} people viewing this now`,
    });
  }

  const limit = Math.max(1, Math.min(5, settings.maxHooks));

  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((candidate) => candidate.hook);
}

/** Builds a stable per-product seed for wording and ordering variety. */
export function seedFromProductId(productId: string): number {
  const hourBucket = Math.floor(Date.now() / (1000 * 60 * 60));
  let hash = hourBucket;
  for (let i = 0; i < productId.length; i++) {
    hash = (hash * 31 + productId.charCodeAt(i)) | 0;
  }
  return hash;
}
