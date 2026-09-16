// Fetches the current hooks for this product from the app's App Proxy
// endpoint and renders them. Deliberately dumb: every decision about
// which hooks to show and what they say happens server-side in
// app/lib/hooks.server.ts, so this file never needs to change when a
// hook's rules change.
//
// Variant-change detection uses the standard hidden `<input name="id">` /
// `<select name="id">` that Shopify's own product forms rely on for the
// variant ID — this covers Dawn and most OS 2.0 themes, but has not been
// verified against every theme. If hooks don't update when a shopper
// switches variants on a specific theme, check what that theme actually
// names its variant-id field and adjust the selector below.
(function () {
  "use strict";

  function renderHooks(container, hooks) {
    if (!hooks || hooks.length === 0) {
      container.hidden = true;
      container.innerHTML = "";
      return;
    }

    container.innerHTML = hooks
      .map(
        (hook) =>
          `<div class="hooks-badge hooks-badge--${hook.id}">` +
          `<span class="hooks-badge__icon" aria-hidden="true">${hook.icon}</span>` +
          `<span class="hooks-badge__text">${hook.text}</span>` +
          `</div>`,
      )
      .join("");
    container.hidden = false;
  }

  async function loadHooks(container) {
    const productId = container.getAttribute("data-product-id");
    const variantId = container.getAttribute("data-variant-id");
    if (!productId) return;

    const params = new URLSearchParams({ product_id: productId });
    if (variantId) params.set("variant_id", variantId);

    try {
      const response = await fetch(`/apps/hooks/hook-data?${params.toString()}`, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        container.hidden = true;
        return;
      }
      const data = await response.json();
      renderHooks(container, data.hooks);
    } catch (error) {
      // Network hiccup or the app is down - fail closed (hide), never show
      // stale or placeholder hook text.
      container.hidden = true;
    }
  }

  function findVariantInput(container) {
    const form = container.closest("form");
    if (!form) return null;
    return form.querySelector('[name="id"]');
  }

  function init(container) {
    loadHooks(container);

    const variantInput = findVariantInput(container);
    if (variantInput) {
      variantInput.addEventListener("change", () => {
        const value = variantInput.value;
        if (value) {
          container.setAttribute("data-variant-id", value);
          loadHooks(container);
        }
      });
    }
  }

  document.querySelectorAll("[data-hooks-badge]").forEach(init);
})();
