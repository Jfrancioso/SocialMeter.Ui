// What a title page says before any JavaScript runs: the <title>, the description, the link-preview tags, the
// structured data and a short block of real text. Search engines read this first, and link previews (iMessage, X,
// Discord, Slack) only ever read this. Pure functions, so they are tested without Cloudflare (test/seo.test.js).

export const SITE = "https://chatterbub.com";
const TMDB_IMAGE = "https://image.tmdb.org/t/p/";

const KINDS = {
  movie: { noun: "movie", schema: "Movie", ogType: "video.movie", besides: "IMDb, Rotten Tomatoes and Metacritic" },
  tv: { noun: "TV show", schema: "TVSeries", ogType: "video.tv_show", besides: "IMDb, Rotten Tomatoes and Metacritic" },
  game: { noun: "game", schema: "VideoGame", ogType: "website", besides: "Steam's all-time rating" }
};

/** "/title/movie/1400940" → { type: "movie", id: 1400940 }; anything else → null. */
export function parseTitlePath(pathname) {
  const m = /^\/title\/(movie|tv|game)\/(\d{1,9})\/?$/.exec(pathname);
  return m ? { type: m[1], id: Number(m[2]) } : null;
}

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/** At most `max` characters, cut at a word boundary, with an ellipsis when cut. */
export function clip(s, max) {
  const text = String(s ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), max * 0.6)).trimEnd() + "…";
}

/** TMDB gives "/abc.jpg"; Steam gives a full URL. */
export function imageUrl(path, size) {
  if (!path) return null;
  return /^https?:\/\//.test(path) ? path : `${TMDB_IMAGE}${size}${path}`;
}

/**
 * Everything the page head needs for one title.
 * @param {{type: string, id: number}} key
 * @param {object} title  the API's title (GET /api/titles/{type}/{id})
 * @param {object|null} reading  the cached reading (GET /api/socialmeter/snapshots), or null when there is none
 */
export function describeTitle(key, title, reading) {
  const kind = KINDS[key.type];
  const year = title.releaseDate ? String(title.releaseDate).slice(0, 4) : null;
  const nameYear = year ? `${title.name} (${year})` : title.name;
  const url = `${SITE}/title/${key.type}/${key.id}`;
  const scored = reading && reading.totalPosts > 0;

  // The score sentence is the one thing only Chatterbub can say about a title, so it leads when there is one.
  const scoreSentence = scored
    ? `Chatterbub score ${reading.score} (${reading.label}) from ${reading.totalPosts} counted ${key.type === "game" ? "reviews and posts" : "posts"}.`
    : null;
  const pageTitle = scored ? `${nameYear}: Chatterbub score ${reading.score} (${reading.label})` : `${nameYear} · Chatterbub`;
  const counted = scored ? `${reading.totalPosts} counted ${key.type === "game" ? "reviews and posts" : "posts"}` : null;
  const description = scored
    ? clip(`What people are actually saying about ${title.name}: a Chatterbub score of ${reading.score} (${reading.label}) from ${counted}, beside ${kind.besides}.`, 200)
    : clip(title.overview || `What people are saying about ${title.name}, the ${kind.noun}, on Chatterbub.`, 200);

  // Link previews look best with a wide image: the backdrop for movies and shows, the store header for games.
  const image = key.type === "game"
    ? title.headerImage || title.backdropPath || title.posterPath || null
    : imageUrl(title.backdropPath, "w1280") || imageUrl(title.posterPath, "w780");

  const sameAs = [
    title.imdbId ? `https://www.imdb.com/title/${title.imdbId}/` : null,
    key.type === "game" ? `https://store.steampowered.com/app/${key.id}/` : `https://www.themoviedb.org/${key.type}/${key.id}`
  ].filter(Boolean);

  // Basic facts only. No aggregateRating: Google's review rules are about ratings people give on this site, and the
  // Chatterbub score is read from posts elsewhere, so claiming it as a rating could be treated as misleading.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": kind.schema,
    name: title.name,
    url,
    ...(image ? { image } : {}),
    ...(title.overview ? { description: clip(title.overview, 500) } : {}),
    ...(title.releaseDate ? { datePublished: title.releaseDate } : {}),
    ...(title.genres?.length ? { genre: title.genres } : {}),
    ...(title.developer ? { author: { "@type": "Organization", name: title.developer } } : {}),
    ...(key.type !== "game" && title.creators?.length
      ? { [key.type === "tv" ? "creator" : "director"]: title.creators.map((name) => ({ "@type": "Person", name })) }
      : {}),
    ...(title.cast?.length ? { actor: title.cast.slice(0, 5).map((c) => ({ "@type": "Person", name: c.name })) } : {}),
    sameAs
  };

  return {
    title: pageTitle,
    description,
    ogType: kind.ogType,
    image,
    imageAlt: `${nameYear}${scored ? `, Chatterbub score ${reading.score}` : ""}`,
    canonical: url,
    jsonLd: jsonLdScript(jsonLd),
    // Real text for crawlers that do not run JavaScript. It sits inside #app, which the Vue app replaces on start, so
    // visitors see it for a moment at most; it says what the page itself says.
    bodyHtml:
      `<main class="seo-fallback"><h1>${escapeHtml(nameYear)}</h1>` +
      (scoreSentence ? `<p>${escapeHtml(scoreSentence)}</p>` : "") +
      (title.overview ? `<p>${escapeHtml(clip(title.overview, 600))}</p>` : "") +
      `<p><a href="/">Chatterbub</a>: what people are actually saying about movies, shows and games.</p></main>`
  };
}

/** For a title id that does not exist: a clear page that search engines are told not to index. */
export function describeMissing(key) {
  return {
    title: "Title not found · Chatterbub",
    description: `There is no ${KINDS[key.type].noun} with this id on Chatterbub.`,
    noindex: true
  };
}

/** JSON inside <script> must not contain "</script" or "<!--"; escaping "<" covers both. */
export function jsonLdScript(obj) {
  return `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`;
}

/** The fixed pages worth listing. Search results and the admin page are left out (robots.txt disallows them). */
export const STATIC_PAGES = ["/", "/browse/movie", "/browse/tv", "/browse/game", "/how-it-works", "/privacy"];

/**
 * sitemap.xml from the API's list of titles with a reading (GET /api/seo/titles): [{ type, id, lastModified }].
 */
export function sitemapXml(titles) {
  const entry = (loc, lastmod) =>
    `  <url><loc>${escapeHtml(SITE + loc)}</loc>${lastmod ? `<lastmod>${String(lastmod).slice(0, 10)}</lastmod>` : ""}</url>`;
  const lines = [
    ...STATIC_PAGES.map((p) => entry(p)),
    ...titles
      .filter((t) => KINDS[t.type] && Number.isInteger(t.id) && t.id > 0)
      .map((t) => entry(`/title/${t.type}/${t.id}`, t.lastModified))
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${lines.join("\n")}\n</urlset>\n`;
}
