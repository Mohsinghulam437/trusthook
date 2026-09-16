# Deploying TrustHook to Render (free tier)

These are the exact settings for hosting this app on Render's free plan, so
the app has a permanent public URL and no dev tunnel (ngrok / Cloudflare) is
needed ever again.

## Render web service settings

| Field | Value |
| --- | --- |
| Language / Environment | Node |
| Branch | `main` |
| Build Command | `npm install && npm run build` |
| Start Command | `npm run docker-start` |
| Instance Type | Free |

`npm run docker-start` runs `prisma generate && prisma migrate deploy` first,
then serves the built app — so the database tables are created automatically
on every boot.

## Environment variables

| Key | Value |
| --- | --- |
| `SHOPIFY_API_KEY` | `00c3ade2cf9aadc72f29dd2774b2bbda` (the app's client_id — public, not a secret) |
| `SHOPIFY_API_SECRET` | From Partner Dashboard → TrustHook → API credentials → **Client secret** |
| `SCOPES` | `read_products` |
| `SHOPIFY_APP_URL` | `https://<your-render-service-name>.onrender.com` |
| `NODE_VERSION` | `22.14.0` |

`SHOPIFY_API_SECRET` is a real secret. It goes in Render's environment
variables only — never in this repo, never in `shopify.app.toml`.

## After the first deploy succeeds

1. Copy the Render URL (e.g. `https://trusthook.onrender.com`).
2. On your local machine, edit `shopify.app.toml` and set:
   - `application_url = "https://trusthook.onrender.com"`
   - `redirect_urls = [ "https://trusthook.onrender.com/auth/callback" ]`
   - `[app_proxy] url = "https://trusthook.onrender.com/proxy"`
3. Run `shopify app deploy` locally. This pushes the app config, webhooks and
   the theme app extension to Shopify. No tunnel is involved.
4. Install the app on the dev store and add the "Hooks" block to a product
   page in the theme editor.

## Known limits of the free tier

- The service sleeps after ~15 minutes of inactivity and takes ~30-60 seconds
  to wake on the next request. Fine for testing; the first product-page load
  after a nap will show hooks late or not at all.
- The filesystem is ephemeral, so the SQLite database resets on every deploy
  and restart. Merchant settings and sessions are recreated on next use
  (the app upserts them), so nothing breaks — but before real merchants use
  this, switch `prisma/schema.prisma` to a hosted Postgres database and set
  `DATABASE_URL` in Render.
