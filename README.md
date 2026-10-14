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
- One-tap voting with voter names, toggle to unvote — casting a vote sets off a
  confetti celebration (banner only for people who prefer reduced motion)
- Separate tabs (and separate lists) for each leg of the trip — Nov 25–26 for
  9 people, Nov 26–29 for 14; "Go to Airbnb" opens each listing with that
  tab's dates and guest count
- Sort by votes or price, filter by area
- Anyone with the link can remove a listing (with a confirm dialog)
- Manual-add fallback when auto-scrape fails
- Blackjack: one live table (up to 6 seats) everyone joins from their own
  phone, play chips only
- No passwords, no database server

## How it works

- **Frontend** (`web/`): React + Vite + Tailwind, one folder per feature
  (`web/src/features/hunt`, `split`, `blackjack`). People log in by picking
  their name from the group's user list; votes are tied to that user's token.
- **Backend** (`worker/`): a Cloudflare Worker, one folder per feature, each
  exporting its own route table that `worker/index.js` merges. A small JSON API:
  `GET /api/state`, `POST /api/add`, `/api/add-manual`, `/api/vote`,
  `/api/enrich`, `/api/remove`. Every call names its tab (`?trip=` on the GET,
  `trip` in POST bodies: `nov25` or `nov26`); calls without one go to `nov26`.
- **Storage**: Cloudflare KV — one key per trip tab (`state:nov25:v1` for the
  9-person leg, the original `state:v1` for the 14-person leg), each holding
  that tab's listings array as JSON. Two keys are shared by the whole group
  rather than per tab: `users:v1` (the name list people log in with, which is
  also the Split-that-bill member list) and `split:v1` (one expense ledger).
- **Blackjack** (`GET /api/bj`, a WebSocket): the table lives in one Durable
  Object, `BlackjackTable` (SQLite-backed, which the free plan requires). The
  game runs there and every seated or watching client gets the whole table
  after each change. Chips are saved in the object's own storage only when a
  player stands up or disconnects, not per hand, so play doesn't use the KV
  write budget.
- **Listing enrichment**: pasted Airbnb URLs are scraped server-side. Because
  Airbnb bot-blocks datacenter IPs, the scraper tries three levels: direct
  fetch → `airbnb.co.uk` (same listing, no bot wall) → the `r.jina.ai` reader
  proxy. Live prices for each trip's dates come from the same price request
  Airbnb's own listing page makes (`worker/listings/prices.js`), cached 6 hours.

## Develop

```bash
npm install
npm run dev:api   # terminal 1: the worker on :8787 (KV + Blackjack run locally)
npm run dev       # terminal 2: the page on :5173 with hot reload, /api proxied to :8787
npm run check     # lint + build + bundle the worker, same as CI runs on every PR
```

`npm run dev:api` alone also works: it builds the page and serves everything on
:8787, just without hot reload.

## Deploy your own

You need a free [Cloudflare](https://dash.cloudflare.com/sign-up) account and
`wrangler`:

```bash
npm install
npx wrangler login
npx wrangler kv namespace create VOTES_KV
# put the printed namespace id into wrangler.toml under [[kv_namespaces]]
npx wrangler deploy   # builds the frontend first (wrangler.toml [build])
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
- Pushes to `main` deploy through the GitHub Action (`.github/workflows/deploy.yml`).
  There's no paste-into-Quick-Edit bundle anymore: the app has a build step.

## Project layout

| Path | What it is |
|---|---|
| `web/src/features/<feature>/` | One folder per page: components, hooks and CSS for that feature |
| `web/src/components/` | Shared UI: splash, nav, header, login, toast |
| `web/src/lib/`, `web/src/session/` | Shared helpers, trip/page config, the logged-in user |
| `worker/index.js` | Worker entry: merges the route tables, serves `dist/` |
| `worker/<feature>/` | `listings/`, `users/`, `split/`, `blackjack/`: storage, logic and routes |
| `worker/config/` | Trips and seed listings |
| `wrangler.toml` | Deploy config (build step, KV, assets, Durable Object) |
| `CONTRIBUTING.md` | Where new code goes, and how to keep PRs from colliding |
| `ARCHITECTURE.md` | Detailed technical notes (in Chinese) |

## License

MIT — see [LICENSE](LICENSE).
