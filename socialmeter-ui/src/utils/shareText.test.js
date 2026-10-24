import { test } from "node:test";
import assert from "node:assert/strict";
import { blueskyAppUrl, xAppComposeUrl, xComposeUrl, xPostText } from "./shareText.js";

const post = "Carrie (2026)\nChatterbub score 60 · Warm\n58% loved it · 35% hated it · 78 posts\nchatterbub.com/title/tv/288673";
const thread = "https://bsky.app/profile/chatterbub.bsky.social/post/3mylyyr7gv32d";

test("the X post links the Bluesky thread for the case for and against, keeping the title's link last", () => {
  assert.equal(
    xPostText(post, thread, { hasFor: true, hasAgainst: true }),
    "Carrie (2026)\nChatterbub score 60 · Warm\n58% loved it · 35% hated it · 78 posts\nThe case for and against, on Bluesky: " + thread + "\nchatterbub.com/title/tv/288673"
  );
  assert.match(xPostText(post, thread, { hasAgainst: true }), /\nThe case against, on Bluesky: /);
  assert.equal(xPostText(post, null, { hasFor: true, hasAgainst: true }), post);   // not on Bluesky yet: just the facts
  assert.equal(xPostText(post, thread), post);                                      // nothing was quoted
});

test("the X composer link carries the post exactly, line breaks and symbols included", () => {
  const text = "Carrie (2026)\nChatterbub score 60 · Warm\n58% loved it · 35% hated it · 78 posts\nchatterbub.com/title/tv/288673";
  const url = new URL(xComposeUrl(text));

  assert.equal(url.origin + url.pathname, "https://x.com/intent/post");
  assert.equal(url.searchParams.get("text"), text);
  assert.ok(!xComposeUrl("50% & more #tags").includes("&more"), "an & in the text can't start a second parameter");
});

test("the app links carry the same post, and only bsky.app pages become Bluesky app links", () => {
  const text = "Carrie (2026)\n58% loved it · 35% hated it";

  assert.equal(xAppComposeUrl(text), `twitter://post?message=${encodeURIComponent(text)}`);
  assert.equal(blueskyAppUrl("https://bsky.app/profile/did:plc:abc/post/3kx"), "bluesky://profile/did:plc:abc/post/3kx");
  assert.equal(blueskyAppUrl("https://evil.example/profile/x"), null);
  assert.equal(blueskyAppUrl(null), null);
});
