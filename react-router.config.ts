import type { Config } from "@react-router/dev/config";

export default {
  // React Router 7.18 added CSRF protection that rejects any action (POST)
  // whose `origin` header doesn't match the app's own origin, with a bare
  // "400 Bad Request" — which surfaces in the browser as "Application Error"
  // and in the logs as `Error: Bad Request` thrown from `singleFetchAction`.
  // Loaders (GET) are not checked, which is why the settings page loads fine
  // and only saving breaks.
  //
  // Shopify renders embedded apps inside a sandboxed admin iframe, so form
  // submissions arrive with an origin this app cannot predict — observed
  // values include `https://admin.shopify.com` and the opaque `null` that a
  // sandboxed frame sends. Allowlisting the known Shopify hosts alone was not
  // enough (verified against the real 7.18.4 check), so the catch-all is here
  // deliberately.
  //
  // Why that is acceptable *for this app specifically*: every action route
  // calls `authenticate.admin(request)` before it touches any data, and that
  // verifies a Shopify session token (a JWT signed with this app's client
  // secret). A forged cross-site POST has no valid token and is rejected
  // there. This app has no cookie-authenticated mutating endpoints, so the
  // origin check is not the thing standing between an attacker and the data —
  // Shopify's token is. The App Proxy and webhook routes are resource routes,
  // which this check never applied to anyway; they keep their own HMAC checks.
  allowedActionOrigins: [
    "admin.shopify.com",
    "*.myshopify.com",
    "*.shopify.com",
    "null",
    "**",
  ],
} satisfies Config;
