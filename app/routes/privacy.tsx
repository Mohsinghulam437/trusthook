// Public privacy policy, served at https://<app-url>/privacy
//
// The Shopify App Store requires a reachable privacy policy URL before an
// app can be submitted. Hosting it inside the app itself means there is no
// separate site to maintain and no chance of the link rotting.
//
// A resource route (no default export) returning plain HTML: no React, no
// App Bridge, no session — it has to be readable by a reviewer and by any
// merchant who clicks the link from the listing, neither of whom is logged
// into anything.
//
// Keep this honest and in sync with what the app actually does. If the app
// ever starts reading order or customer data, this page changes first.
const LAST_UPDATED = "17 September 2026";
const CONTACT_EMAIL = "mohsinghulam437a@gmail.com";

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>TrustHook — Privacy Policy</title>
<style>
  :root { color-scheme: light dark; }
  body {
    margin: 0 auto; padding: 48px 24px 96px; max-width: 46rem;
    font: 16px/1.65 -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1f2328; background: #fff;
  }
  @media (prefers-color-scheme: dark) {
    body { color: #e6e6e6; background: #111418; }
    a { color: #7cb0ff; }
  }
  h1 { font-size: 1.9rem; margin: 0 0 .25em; }
  h2 { font-size: 1.15rem; margin: 2.2em 0 .5em; }
  .meta { opacity: .65; font-size: .92rem; margin-bottom: 2.5em; }
  ul { padding-left: 1.2em; }
  li { margin: .35em 0; }
  code { background: rgba(127,127,127,.15); padding: .1em .35em; border-radius: 4px; }
</style>
</head>
<body>
  <h1>TrustHook — Privacy Policy</h1>
  <p class="meta">Last updated: ${LAST_UPDATED}</p>

  <p>TrustHook is a Shopify app that shows product-page badges built from a
  store's own data — real inventory levels, a sale end time the merchant sets,
  the merchant's own shipping message, and a live count of how many people are
  viewing a product. This policy explains exactly what the app stores and why.</p>

  <h2>What the app stores about a merchant</h2>
  <ul>
    <li>The store's <code>myshopify.com</code> domain and the access token
      Shopify issues when the app is installed. Without these the app cannot
      talk to the store at all.</li>
    <li>The badge settings chosen in the app: which hooks are on, the low-stock
      threshold, the sale end date, and the wording of the shipping message.</li>
  </ul>

  <h2>What the app reads from Shopify</h2>
  <ul>
    <li><strong>Product and inventory data</strong> (<code>read_products</code>,
      <code>read_inventory</code>) — the quantity available for the product a
      shopper is viewing, so the low-stock and in-stock badges show the real
      number. This is read at the moment a product page is viewed and is not
      stored.</li>
  </ul>
  <p>The app does <strong>not</strong> request access to orders, customers,
  checkouts, or payment information, and cannot read them.</p>

  <h2>What the app stores about shoppers</h2>
  <p>Only what the live viewer count needs, and nothing that identifies anyone:</p>
  <ul>
    <li>A random token generated in the shopper's browser tab, held in that
      tab's <code>sessionStorage</code> and discarded when the tab closes.</li>
    <li>The product being viewed and the time it was viewed.</li>
  </ul>
  <p>No name, email address, IP address, customer account, order, or payment
  detail is collected, and the random token is never linked to a person or to
  any Shopify customer record. These rows exist so the badge can say how many
  distinct browsers have the page open; they are deleted automatically within
  an hour.</p>

  <h2>Cookies and tracking</h2>
  <p>The app sets no cookies on the storefront and runs no advertising or
  analytics trackers. The viewer-count token described above is not a cookie
  and is not readable by any other site.</p>

  <h2>Sharing</h2>
  <p>Data is never sold, rented, or shared for marketing. It is held only by
  the services needed to run the app: Render (application hosting) and Neon
  (database), both of which process it solely on TrustHook's behalf.</p>

  <h2>Retention and deletion</h2>
  <ul>
    <li>Viewer-count rows are deleted automatically within an hour.</li>
    <li>Merchant settings and the session are deleted when the app is
      uninstalled, via Shopify's <code>app/uninstalled</code> and
      <code>shop/redact</code> webhooks.</li>
    <li>Shopify's <code>customers/data_request</code> and
      <code>customers/redact</code> webhooks are implemented as required. They
      return nothing to erase, because the app holds no customer data.</li>
  </ul>

  <h2>Your rights</h2>
  <p>Merchants can remove everything the app holds by uninstalling it, or
  request access to or deletion of their data at any time by writing to the
  address below. Requests are answered within 30 days.</p>

  <h2>Changes</h2>
  <p>If the app ever starts handling data beyond what is described here, this
  page will be updated before that change goes live.</p>

  <h2>Contact</h2>
  <p>TrustHook — <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>
</body>
</html>`;

export const loader = () => {
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
