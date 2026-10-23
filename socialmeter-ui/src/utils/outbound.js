import { countOutbound } from "../api";

// The single door for every link that leaves Chatterbub (posts, rating sources, trailers, stores, and later "where to
// watch"). Today `outboundHref` changes nothing; when an affiliate or partner deal exists, its codes go in `decorate` and
// nowhere else. Each click is counted as an anonymous tally: the kind of link and the destination site, nothing about
// who clicked (see the API's OutboundClicks).

/** "post" | "rating" | "trailer" | "store" | "watch" */
export const OUTBOUND_KINDS = ["post", "rating", "trailer", "store", "watch"];

// Partner parameters by destination host, added when a deal exists. Empty on purpose.
const partners = {};

function decorate(url) {
  const tag = partners[url.hostname];
  if (tag) Object.entries(tag).forEach(([k, v]) => url.searchParams.set(k, v));
  return url;
}

/** The address to link to: the original, plus any partner parameters for its site. */
export function outboundHref(href) {
  if (!href) return undefined;
  try {
    return decorate(new URL(href)).toString();
  } catch {
    return href; // not an absolute URL; leave it alone
  }
}

/** Counts one click on an outbound link. Never blocks or fails the navigation. */
export function trackOutbound(href, kind) {
  if (!href || !OUTBOUND_KINDS.includes(kind)) return;
  try {
    countOutbound(kind, new URL(href).hostname);
  } catch {
    // not a URL we can read a site from; nothing to count
  }
}
