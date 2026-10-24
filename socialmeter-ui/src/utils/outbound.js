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

// A link that leaves the site only if it's an ordinary web address (http or https); anything else, such as a
// "javascript:" or "data:" URL arriving in a post or a source's data, or text that isn't a URL, gives no link at all.
function webUrl(href) {
  if (!href) return undefined;
  try {
    const url = new URL(href);
    return url.protocol === "https:" || url.protocol === "http:" ? url : undefined;
  } catch {
    return undefined;
  }
}

/** The address as given if it's an ordinary web address, else undefined (for links that aren't counted). */
export const safeHref = (href) => webUrl(href)?.toString();

/** The address to link to: the original, plus any partner parameters for its site. Undefined when it isn't safe. */
export function outboundHref(href) {
  const url = webUrl(href);
  return url ? decorate(url).toString() : undefined;
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
