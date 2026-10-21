const IMG_BASE = "https://image.tmdb.org/t/p/";

/** Builds a TMDB image URL. `path` already carries its leading slash. */
export function tmdbImage(path, size = "w500") {
  if (!path) return "";
  return `${IMG_BASE}${size}${path}`;
}
