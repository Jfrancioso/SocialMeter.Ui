import { test } from "node:test";
import assert from "node:assert/strict";
import { clip, describeMissing, describeTitle, escapeHtml, imageUrl, jsonLdScript, parseTitlePath, sitemapXml } from "../src/seo.js";

const clayface = {
  name: "Clayface", releaseDate: "2026-10-19", overview: "Matt Hagen's meteoric rise from Gotham street kid to Hollywood leading man.",
  posterPath: "/poster.jpg", backdropPath: "/backdrop.jpg", genres: ["Horror", "Thriller"], imdbId: "tt34890576",
  creators: ["James Watkins"], cast: [{ name: "Tom Rhys Harries", character: "Matt Hagen / Clayface" }]
};

test("only real title URLs are handled", () => {
  assert.deepEqual(parseTitlePath("/title/movie/1400940"), { type: "movie", id: 1400940 });
  assert.deepEqual(parseTitlePath("/title/tv/124364/"), { type: "tv", id: 124364 });
  assert.equal(parseTitlePath("/title/book/1"), null);
  assert.equal(parseTitlePath("/title/movie/abc"), null);
  assert.equal(parseTitlePath("/title/movie/1/extra"), null);
});

test("a scored title leads with its score", () => {
  const d = describeTitle({ type: "movie", id: 1400940 }, clayface, { score: 81, label: "Electric", totalPosts: 202 });
  assert.equal(d.title, "Clayface (2026): Chatterbub score 81 (Electric)");
  assert.match(d.description, /^What people are actually saying about Clayface: a Chatterbub score of 81 \(Electric\) from 202 counted posts, beside IMDb/);
  assert.equal(d.canonical, "https://chatterbub.com/title/movie/1400940");
  assert.equal(d.image, "https://image.tmdb.org/t/p/w1280/backdrop.jpg");
  assert.equal(d.ogType, "video.movie");
  assert.match(d.bodyHtml, /<h1>Clayface \(2026\)<\/h1>/);
  assert.match(d.jsonLd, /"@type":"Movie"/);
  assert.match(d.jsonLd, /"director":\[\{"@type":"Person","name":"James Watkins"\}\]/);
  assert.doesNotMatch(d.jsonLd, /aggregateRating/);
});

test("a title without a reading uses its synopsis", () => {
  const d = describeTitle({ type: "tv", id: 1 }, { ...clayface, name: "Quiet Show" }, null);
  assert.equal(d.title, "Quiet Show (2026) · Chatterbub");
  assert.match(d.description, /^Matt Hagen/);
  assert.doesNotMatch(d.bodyHtml, /Chatterbub score/);
});

test("games use the Steam header image and Steam link", () => {
  const d = describeTitle({ type: "game", id: 1422450 },
    { name: "Deadlock", headerImage: "https://cdn.steam/header.jpg", developer: "Valve", genres: ["Action"] },
    { score: 72, label: "Hot", totalPosts: 19 });
  assert.equal(d.image, "https://cdn.steam/header.jpg");
  assert.match(d.description, /19 counted reviews and posts, beside Steam's all-time rating/);
  assert.match(d.jsonLd, /"@type":"VideoGame"/);
  assert.match(d.jsonLd, /store\.steampowered\.com\/app\/1422450/);
});

test("text from TMDB can never break out of the page", () => {
  const evil = { ...clayface, name: "<script>alert(1)</script>", overview: "</script><img src=x onerror=alert(1)>" };
  const d = describeTitle({ type: "movie", id: 1 }, evil, null);
  assert.doesNotMatch(d.bodyHtml, /<script>|<img/);
  assert.doesNotMatch(d.jsonLd.slice(35, -9), /<\/script|<img/);   // inside the JSON-LD block
  assert.equal(escapeHtml(`a"b'<c>&`), "a&quot;b&#39;&lt;c&gt;&amp;");
  // The "<" inside the JSON becomes the six characters \u003c, so the block can never be closed early.
  assert.equal(jsonLdScript({ x: "</script>" }), '<script type="application/ld+json">{"x":"\\u003c/script>"}</script>');
});

test("missing titles are marked noindex", () => {
  const d = describeMissing({ type: "movie", id: 99999999 });
  assert.equal(d.noindex, true);
  assert.match(d.title, /not found/);
});

test("helpers", () => {
  assert.equal(imageUrl("/a.jpg", "w780"), "https://image.tmdb.org/t/p/w780/a.jpg");
  assert.equal(imageUrl("https://x/y.jpg", "w780"), "https://x/y.jpg");
  assert.equal(imageUrl(null, "w780"), null);
  assert.equal(clip("one two three four", 10), "one two…");
  assert.equal(clip("short", 10), "short");
});

test("the sitemap lists fixed pages and titles with readings", () => {
  const xml = sitemapXml([
    { type: "movie", id: 1400940, lastModified: "2026-10-23T19:00:00Z" },
    { type: "tv", id: 124364, lastModified: "2026-10-23T08:16:56Z" },
    { type: "book", id: 5, lastModified: "2026-10-23" },          // unknown kind: dropped
    { type: "movie", id: -3 }                                      // bad id: dropped
  ]);
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<loc>https:\/\/chatterbub\.com\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/chatterbub\.com\/title\/movie\/1400940<\/loc><lastmod>2026-10-23<\/lastmod>/);
  assert.doesNotMatch(xml, /book|-3/);
  assert.doesNotMatch(xml, /\/admin|\/search/);
});
