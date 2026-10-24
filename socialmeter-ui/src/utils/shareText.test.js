import { test } from "node:test";
import assert from "node:assert/strict";
import { blueskyAppUrl, xAppComposeUrl, xComposeUrl } from "./shareText.js";

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
