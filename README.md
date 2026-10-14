# Thanksgiving Airbnb Vote

A tiny full-stack app for group trip planning. Share one public link, and anyone
with the link can paste Airbnb listing URLs into a shared shortlist, vote for
their favorites, and watch the live ranking.

Originally built for a ~10-person Thanksgiving trip to the Denver area, but it
works for any group picking a place together.

![stack](https://img.shields.io/badge/Cloudflare-Workers%20%2B%20KV-orange) ![license](https://img.shields.io/badge/license-MIT-green)

## Features

- Paste any Airbnb listing link → title, photo, bedrooms/beds/baths, capacity,
  and rating are auto-filled
- One-tap voting with voter names, toggle to unvote
- Sort by votes or price, filter by area
- Anyone with the link can remove a listing (with a confirm dialog)
- Manual-add fallback when auto-scrape fails
- No login, no build step, no database server

## How it works

- **Frontend** (`public/index.html`): one static page, vanilla JS + Tailwind CSS
  via CDN. Voters are identified by a random token in `localStorage` — no
  accounts.
- **Backend** (`worker.js`): a Cloudflare Worker serving a small JSON API:
  `GET /api/state`, `POST /api/add`, `/api/add-manual`, `/api/vote`,
  `/api/enrich`, `/api/remove`.
- **Storage**: Cloudflare KV — a single key (`state:v1`) holding the listings
  array as JSON.
- **Listing enrichment**: pasted Airbnb URLs are scraped server-side. Because
  Airbnb bot-blocks datacenter IPs, the scraper tries three levels: direct
  fetch → `airbnb.co.uk` (same listing, no bot wall) → the `r.jina.ai` reader
  proxy. Prices are intentionally *not* scraped (Airbnb totals are JS-rendered
  per dates/guests); cards link out to Airbnb for the live price.

## Deploy your own

You need a free [Cloudflare](https://dash.cloudflare.com/sign-up) account and
`wrangler`:

```bash
npx wrangler login
npx wrangler kv namespace create VOTES_KV
# put the printed namespace id into wrangler.toml under [[kv_namespaces]]
npx wrangler deploy
```

You'll get `https://<worker-name>.<your-subdomain>.workers.dev` — share it
with your group.

Notes:

- New Cloudflare accounts must verify their email address before Workers or
  API tokens work (the dashboard shows a blocking "Verify your account" modal
  until then).
- `wrangler.toml` must declare `[assets] binding = "ASSETS"` because the
  worker serves the frontend through `env.ASSETS` — without it the homepage
  throws Error 1101.
- `worker-single.js` (regenerate with `node build-single.js`) is a single-file
  bundle you can paste into the Cloudflare dashboard's Worker Quick Edit if
  you'd rather not use wrangler.

## Project layout

| File | What it is |
|---|---|
| `public/index.html` | Frontend (Chinese UI) |
| `worker.js` | Worker, JSON API, and Airbnb scraper |
| `wrangler.toml` | Deploy config (KV binding, assets) |
| `build-single.js` | Builds `worker-single.js` from the two above |
| `ARCHITECTURE.md` | Detailed technical notes (in Chinese) |

## License

MIT — see [LICENSE](LICENSE).
