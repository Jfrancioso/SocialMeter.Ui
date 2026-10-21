const IMG_BASE = "https://image.tmdb.org/t/p/";

export function tmdbImage(path, size = "w500") {
  if (!path) return "";
  // path already includes leading slash from your API response
  return `${IMG_BASE}${size}${path}`;
}
