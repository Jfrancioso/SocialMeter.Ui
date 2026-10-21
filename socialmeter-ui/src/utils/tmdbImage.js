const IMG_BASE = "https://image.tmdb.org/t/p/";

/** Builds a TMDB image URL from a `/path`. Steam artwork arrives as a full URL and is passed through untouched. */
export function tmdbImage(path, size = "w500") {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${IMG_BASE}${size}${path}`;
}
