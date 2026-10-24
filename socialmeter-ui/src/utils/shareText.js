// Getting a post's text onto X, which the site doesn't post to itself (X is posted to by hand).

/** X's own "compose a post" page with the text filled in; on a phone it opens the X app. Nothing is sent until you post. */
export const xComposeUrl = (text) => `https://x.com/intent/post?text=${encodeURIComponent(text)}`;

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
