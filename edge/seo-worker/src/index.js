// Chatterbub's edge Worker (Cloudflare). Routes: chatterbub.com/title/*  and  chatterbub.com/sitemap.xml
//
// Title pages: the site is a single-page app, so every URL used to arrive as the same empty shell titled "Chatterbub".
// This Worker fetches that shell and the title's data at the same time, writes the real title, description,
// link-preview tags, structured data and a short block of text into it, and answers 404 for titles that do not exist.
// The title's data is cached at the edge for an hour; the page itself is never cached here, because it changes with
// every front-end deploy (new asset names) and a stale copy would load scripts that no longer exist.
//
// It only ever reads cached readings (the snapshots endpoint), so a crawler can never set off a paid live pull, and it
// fails open: if the API is slow or down, the visitor gets the ordinary page.

import { SITE, describeMissing, describeTitle, parseTitlePath, sitemapXml } from "./seo.js";

const API = "https://api.chatterbub.com";
const DATA_TTL = 3600;          // seconds a title's data is reused at the edge
const MISSING_TTL = 600;        // a title that does not exist may be added to TMDB later
const API_TIMEOUT_MS = 3000;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/sitemap.xml") return sitemap(ctx);

    const key = parseTitlePath(url.pathname);
    if (key && (request.method === "GET" || request.method === "HEAD")) return titlePage(request, url, key, ctx);

    return fetch(request);
  }
};

async function titlePage(request, url, key, ctx) {
  // The shell always comes from chatterbub.com itself (also when this runs on a workers.dev preview address).
  // A Worker's request to its own zone goes straight to the origin, so this cannot loop.
  const [shell, data] = await Promise.all([
    fetch(new Request(`${SITE}${url.pathname}${url.search}`, request)),
    titleData(key, ctx).catch(() => null)
  ]);

  const isHtml = (shell.headers.get("content-type") || "").includes("text/html");
  if (!data || !shell.ok || !isHtml) return shell;   // fail open

  const head = data.missing ? describeMissing(key) : describeTitle(key, data.title, data.reading);
  const rewritten = rewrite(head).transform(shell);

  const headers = new Headers(rewritten.headers);
  headers.set("x-chatterbub-seo", data.missing ? "missing" : "title");
  return new Response(rewritten.body, { status: data.missing ? 404 : 200, headers });
}

function rewrite(head) {
  const setContent = (value) => ({ element: (el) => (value == null ? el.remove() : el.setAttribute("content", value)) });

  let rewriter = new HTMLRewriter()
    .on("title", { element: (el) => el.setInnerContent(head.title) })
    .on('meta[name="description"]', setContent(head.description))
    .on('meta[property="og:title"]', setContent(head.title))
    .on('meta[property="og:description"]', setContent(head.description))
    .on('meta[property="og:type"]', setContent(head.ogType ?? "website"))
    .on('meta[property="og:image"]', setContent(head.image ?? `${SITE}/og-image.png`))
    .on('meta[property="og:image:alt"]', setContent(head.imageAlt ?? head.title))
    // The site-wide card is 1200x630; a title's own image is not, so its size is left for the reader to work out.
    .on('meta[property="og:image:width"]', { element: (el) => head.image && el.remove() })
    .on('meta[property="og:image:height"]', { element: (el) => head.image && el.remove() });

  rewriter = rewriter.on("head", {
    element: (el) => {
      const extra = [];
      if (head.canonical) extra.push(`<link rel="canonical" href="${head.canonical}" />`, `<meta property="og:url" content="${head.canonical}" />`);
      if (head.noindex) extra.push(`<meta name="robots" content="noindex" />`);
      if (head.jsonLd) extra.push(head.jsonLd);
      if (extra.length) el.append(extra.join("\n    "), { html: true });
    }
  });

  if (head.bodyHtml) rewriter = rewriter.on("#app", { element: (el) => el.setInnerContent(head.bodyHtml, { html: true }) });
  return rewriter;
}

/** The title and its cached reading, from the edge cache or the API. { missing: true } when the title does not exist. */
async function titleData(key, ctx) {
  const cacheKey = new Request(`${SITE}/__seo/title/${key.type}/${key.id}`);
  const cache = caches.default;
  const hit = await cache.match(cacheKey);
  if (hit) return hit.json();

  const [titleRes, readingRes] = await Promise.all([
    apiGet(`/api/titles/${key.type}/${key.id}`),
    apiGet(`/api/socialmeter/snapshots?keys=${key.type}:${key.id}`)
  ]);

  let data;
  if (titleRes.status === 404) data = { missing: true };
  else if (titleRes.ok) {
    const readings = readingRes.ok ? await readingRes.json() : {};
    data = { title: await titleRes.json(), reading: readings[`${key.type}:${key.id}`] ?? null };
  } else {
    throw new Error(`API answered ${titleRes.status}`);   // not cached: the next request tries again
  }

  const ttl = data.missing ? MISSING_TTL : DATA_TTL;
  ctx.waitUntil(cache.put(cacheKey, new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json", "cache-control": `max-age=${ttl}` }
  })));
  return data;
}

async function sitemap(ctx) {
  const cacheKey = new Request(`${SITE}/__seo/sitemap.xml`);
  const cache = caches.default;
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const res = await apiGet("/api/seo/titles");
  if (!res.ok) return new Response("Sitemap temporarily unavailable", { status: 503, headers: { "retry-after": "600" } });

  const xml = sitemapXml(await res.json());
  const response = new Response(xml, {
    headers: { "content-type": "application/xml; charset=utf-8", "cache-control": `public, max-age=${DATA_TTL}` }
  });
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

function apiGet(path) {
  return fetch(`${API}${path}`, {
    headers: { accept: "application/json", "user-agent": "chatterbub-seo-worker" },
    signal: AbortSignal.timeout(API_TIMEOUT_MS)
  });
}
