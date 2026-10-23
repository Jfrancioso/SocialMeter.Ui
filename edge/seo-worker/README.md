# chatterbub-seo (Cloudflare Worker)

The site is a single-page app: before this Worker, every URL arrived as the same empty page titled "Chatterbub", so
search engines and link previews (iMessage, X, Discord, Slack) saw nothing about the title being linked.

This Worker runs at Cloudflare's edge on two routes:

| Route | What it does |
|---|---|
| `chatterbub.com/title/*` | Fetches the page and the title's data at the same time, then writes in the real `<title>`, description, link-preview (Open Graph) tags with the title's image, a canonical URL, structured data (schema.org Movie / TVSeries / VideoGame) and a short block of real text. A title that does not exist answers **404** with `noindex`. |
| `chatterbub.com/sitemap.xml` | Builds the sitemap from `GET api.chatterbub.com/api/seo/titles` (titles with a reading) plus the fixed pages. |

Rules it keeps:

- **Never a paid pull.** It reads the cached reading (`/api/socialmeter/snapshots`), never `/api/socialmeter/{type}/{id}`.
- **Fails open.** If the API is slow (3 s timeout) or down, the visitor gets the ordinary page.
- **Caches data, not pages.** A title's data is reused at the edge for an hour (missing titles ten minutes). The page is
  never cached here: it changes with every front-end deploy, and a stale copy would load scripts that no longer exist.
- **No ratings markup.** The structured data has no `aggregateRating`: Google's review rules are about ratings given on
  the site itself, and the Chatterbub score is read from posts elsewhere.
- **Escapes everything** that comes from TMDB or Steam (tested).

## Files

- `src/seo.js` — the pure part: titles, descriptions, structured data, the sitemap. Tested by `test/seo.test.js`.
- `src/index.js` — the Worker: routing, fetching, `HTMLRewriter`, the edge cache.
- `deploy.mjs` — uploads the Worker and attaches or removes its routes through Cloudflare's API (no dependencies).

## Commands

```bash
node --test                                  # run the tests (from this folder)
node deploy.mjs                              # upload only
node deploy.mjs --routes                     # upload and attach the routes
node deploy.mjs --remove-routes              # rollback: the site goes back to plain pages at once
```

Deploying needs `CLOUDFLARE_API_TOKEN` with Account → Workers Scripts: Edit and Zone (chatterbub.com) → Workers
Routes: Edit. It is kept in Key Vault as `cloudflare-workers-token`:

```bash
CLOUDFLARE_API_TOKEN="$(az keyvault secret show --vault-name socialmeter-jf-kv -n cloudflare-workers-token --query value -o tsv)" node deploy.mjs --routes
```

Check a page the way a crawler sees it:

```bash
curl -s https://chatterbub.com/title/movie/1400940 | grep -E "<title>|og:|canonical|ld\+json"
```
