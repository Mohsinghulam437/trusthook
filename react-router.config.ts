import type { Config } from "@react-router/dev/config";

export default {
  // Shopify renders this app inside an iframe on admin.shopify.com, so every
  // form submission (action / POST) arrives with an `origin` header of
  // https://admin.shopify.com while `request.url` is this app's own host.
  // React Router 7's built-in CSRF protection rejects that mismatch with a
  // bare "400 Bad Request" (it shows up in the browser as "Application
  // Error"), so the Shopify admin hosts have to be allowlisted here.
  //
  // Loaders (GET) are not affected, which is why the settings page can load
  // fine and only saving fails without this.
  //
  // This does NOT apply to resource routes, so the App Proxy endpoint and the
  // webhook routes are unaffected — they keep their own Shopify HMAC checks.
  allowedActionOrigins: [
    "admin.shopify.com",
    "*.myshopify.com",
    "*.shopify.com",
  ],
} satisfies Config;
