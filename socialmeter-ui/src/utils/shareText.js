// Getting a post onto X (posted to by hand) and opening posts in the X and Bluesky apps. On a phone the buttons try the
// app first (its own link type skips the browser), and fall back to the website when no app opens.

/**
 * The post for X: X can't quote Bluesky posts, so once the thread is up on Bluesky, a line linking to it (where the case
 * for and against are quoted) goes in before the title's link. The title's link stays last because X builds its preview
 * card from the last link. Before the Bluesky post exists, the X post is just the facts.
 */
export function xPostText(text, blueskyThreadUrl, { hasFor = false, hasAgainst = false } = {}) {
  if (!blueskyThreadUrl || !(hasFor || hasAgainst)) return text;
  const what = hasFor && hasAgainst ? "The case for and against" : hasFor ? "The case for" : "The case against";
  const lines = text.split("\n");
  const titleLink = lines.pop();
  return [...lines, `${what}, on Bluesky: ${blueskyThreadUrl}`, titleLink].join("\n");
}

/** X's own "compose a post" page with the text filled in. Nothing is sent until you post. */
export const xComposeUrl = (text) => `https://x.com/intent/post?text=${encodeURIComponent(text)}`;

/** The X app's compose screen with the text filled in (X's long-standing twitter:// link). */
export const xAppComposeUrl = (text) => `twitter://post?message=${encodeURIComponent(text)}`;

/** A bsky.app page as the Bluesky app's own link (same path); null for anything that isn't a bsky.app page. */
export function blueskyAppUrl(webUrl) {
  const prefix = "https://bsky.app/";
  return typeof webUrl === "string" && webUrl.startsWith(prefix) ? `bluesky://${webUrl.slice(prefix.length)}` : null;
}

/** A phone or tablet, where the X and Bluesky apps may be installed. */
export const isPhone = () => typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

/**
 * Opens the app link; if the page is still showing a moment later (no app took it), opens the website instead. Call it
 * from a tap, and only on a phone: a computer has no app to open.
 */
export function openInApp(appUrl, webUrl) {
  let left = false;
  const onHide = () => {
    if (document.hidden) left = true;
  };
  document.addEventListener("visibilitychange", onHide);
  setTimeout(() => {
    document.removeEventListener("visibilitychange", onHide);
    if (!left && !document.hidden) window.location.href = webUrl;
  }, 1500);
  window.location.href = appUrl;
}

/**
 * Puts text on the clipboard; true when it worked. Phone browsers often refuse websites the clipboard, so the caller
 * should offer the text to copy by hand when this returns false.
 */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
