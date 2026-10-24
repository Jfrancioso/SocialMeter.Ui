// Tests for the crowd layout: run with `npm test` (Node's built-in runner, no dependencies). The data is made up.
import test from "node:test";
import assert from "node:assert/strict";
import { layoutCrowd, maxDrift, valueX } from "./crowdLayout.js";

const PAD = 16;

/** n posts with values around `value` (spread +-spread) and uneven weights, as the API sends them (heaviest first). */
function crowd(n, value, spread = 0.2, firstId = 1) {
  return Array.from({ length: n }, (_, i) => ({
    id: firstId + i,
    value: Math.max(-1, Math.min(1, value + (((i * 7) % 11) / 10 - 0.5) * spread)),
    share: 100 / (i + 3)
  })).sort((a, b) => b.share - a.share);
}

function check(dots, { width, height, maxHeight = height }) {
  const result = layoutCrowd(dots, { width, height, maxHeight, pad: PAD, rMin: 6, rMax: 13 });
  const placed = result.dots;
  assert.equal(placed.length, dots.length, "every post gets a dot");
  assert.ok(result.height >= height && result.height <= maxHeight, "the strip only grows, and not past maxHeight");

  const drift = maxDrift(width, PAD);
  placed.forEach((p, i) => {
    assert.equal(p.id, dots[i].id, "dots come back in the input's order");
    assert.ok(p.x - p.r >= -0.01 && p.x + p.r <= width + 0.01, "inside the strip left to right");
    assert.ok(p.y - p.r >= 0 && p.y + p.r <= result.height, "inside the strip top to bottom");
    assert.ok(Math.abs(p.x - valueX(dots[i].value, width, PAD)) <= drift + 0.01, "never further than MAX_DRIFT from its value");
  });
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i], b = placed[j];
      assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= a.r + b.r, `dots ${a.id} and ${b.id} overlap`);
    }
  }
  return result;
}

test("a split crowd keeps its two sides apart and in place", () => {
  check([...crowd(25, -0.8), ...crowd(25, 0.8, 0.2, 100)], { width: 900, height: 230 });
});

test("a lopsided crowd stays at its own end instead of spilling into the middle (the You Can See Everything bug)", () => {
  const dots = crowd(80, 0.85, 0.3);
  const result = check(dots, { width: 330, height: 180, maxHeight: 300 });
  assert.ok(result.height > 180, "a crowded phone strip grows taller");
  assert.ok(result.dots.every((p) => p.x > 330 * 0.6), "no loved post is drawn in the middle");
});

test("a big crowd (200 posts) fits on desktop and 100 on a phone", () => {
  check(crowd(200, -0.7, 0.4), { width: 900, height: 230, maxHeight: 300 });
  check(crowd(100, -0.7, 0.4), { width: 330, height: 180, maxHeight: 300 });
});

test("posts with exactly the same value (every neutral post is 0) spread out instead of stacking", () => {
  check(Array.from({ length: 40 }, (_, i) => ({ id: i + 1, value: 0, share: 1 })), { width: 330, height: 180, maxHeight: 300 });
});

test("the same input gives the same picture", () => {
  const dots = crowd(60, 0.3, 1.2);
  assert.deepEqual(layoutCrowd(dots, { width: 600, height: 230 }), layoutCrowd(dots, { width: 600, height: 230 }));
});

test("nothing to draw gives nothing", () => {
  assert.deepEqual(layoutCrowd([], { width: 600, height: 230 }).dots, []);
});
