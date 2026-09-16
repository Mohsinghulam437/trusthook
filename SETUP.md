# Setup — what's done vs. what only you can do

I scaffolded this from Shopify's real, current official template
(`shopify-app-template-react-router`, cloned live from GitHub — not
hand-typed from memory) and built the hooks feature on top of it. Everything
below distinguishes what's already built and verified from what needs your
own Shopify Partners login, which I don't have and can't get around.

## Already done and verified

- Full project scaffold from Shopify's live template (React Router 7,
  Polaris web components, Prisma + SQLite for now).
- `npm install` succeeded (765 packages, real dependency resolution — not
  assumed to work).
- `npx tsc --noEmit` passes clean on every new/changed file. The only two
  errors it currently shows (`HookSettings`/`OrderEvent` not found in
  `@prisma/client`) are because this sandbox's network doesn't allow
  reaching Prisma's binary CDN (`binaries.prisma.sh`) to regenerate the
  Prisma client — they are not bugs in `prisma/schema.prisma`. Run
  `npx prisma generate` once you have this on a machine with normal
  internet access and those two errors disappear.
- `npx eslint` passes clean on every new/changed file.
- The Theme App Extension's `{% schema %}` JSON was parsed and validated
  (valid JSON, setting IDs lowercase/underscore, range steps within
  Shopify's limits), and `shopify.app.toml` was parsed as valid TOML.
- All new Prisma model field names were manually cross-checked against
  every place that reads/writes them (schema field names and code usage
  match exactly — see `app/lib/hooks.server.ts`,
  `app/routes/app._index.tsx`, `app/routes/proxy.hook-data.tsx`,
  `app/routes/webhooks.orders.paid.tsx`).

## Not yet verified — needs a real store, because I don't have one

Nothing in this sandbox can create a Shopify Partner app or a dev store —
that needs your Partner account login, which only exists on your machine.
Three things specifically have not been exercised against a live request
and are flagged in code comments where they live:

1. `app/routes/proxy.hook-data.tsx` — the App Proxy signature verification
   only really gets tested by a real storefront request.
2. `app/routes/webhooks.orders.paid.tsx` — the field names assume
   Shopify's standard REST order webhook shape; worth confirming against
   one real test order.
3. `extensions/hooks-badge/assets/hook-badge.js` — the variant-change
   detection (`form [name="id"]`) covers Dawn and most OS 2.0 themes but
   isn't guaranteed for every theme.

None of these are guesses presented as fact — they're standard, documented
Shopify patterns, just not ones I can click through end-to-end from here.

## What you need to do, in order

1. **Install the Shopify CLI** if you don't have it: `npm install -g @shopify/cli` (or use `npx shopify` each time).
2. **Create the app in your Partner account and link it**: from this folder, run `npm run config:link` (this is `shopify app config link`). It'll ask you to log in to Partners and either pick an existing app or create a new one — this writes your real `client_id` into `shopify.app.toml`.
3. **Get a dev store** if you don't already have one for testing (Partner Dashboard → Stores → Add store → Development store).
4. **Run it**: `npm run dev` (this is `shopify app dev`). The CLI will open a tunnel, print an install link, and hot-reload as you edit. This also fills in real values for `SHOPIFY_API_KEY`/`SHOPIFY_APP_URL` behind the scenes.
5. **Update the App Proxy URL**: `shopify app dev` gives you a tunnel URL (something like `https://xxxx.trycloudflare.com`). Open `shopify.app.toml` and replace `https://REPLACE_WITH_YOUR_APP_URL/proxy` under `[app_proxy]` with `<that tunnel URL>/proxy`, then restart `npm run dev` so the change is picked up. You'll repeat this step after every restart while developing (the tunnel URL changes each time), and one final time with your real production URL when you deploy.
6. **Install on your dev store**, then in the theme editor add the "Hooks" block to a product page (Online Store → Themes → Customize → pick a product → Add block → Hooks), and turn a couple of hooks on from the app's settings screen.
7. **Regenerate the Prisma client** once you're on a machine with normal internet: `npx prisma generate`, then `npx prisma migrate dev --name add_hook_settings_and_order_events` to create the actual database tables for the two new models (this also fixes the two TypeScript errors mentioned above).

Everything from step 2 onward needs your login and can't be done from here — steps 1-7 are yours to run. Ping me once you've got it installed on a dev store and I'll help debug whatever the App Proxy/webhook payload testing above turns up.
