// Tests for the crowd layout: run with `npm test` (Node's built-in runner, no dependencies). The data is made up.
import test from "node:test";
import assert from "node:assert/strict";
import { layoutZones, pickDots, zoneDrift, zoneWidths } from "./crowdLayout.js";

let nextId = 1;

/** n posts on one side, leaning `strength` (0-1) give or take, with uneven weights. */
function side(n, sentiment, strength = 0.7, weight = 1) {
  return Array.from({ length: n }, (_, i) => {
    const s = Math.min(1, Math.max(0, strength + (((i * 7) % 11) / 10 - 0.5) * 0.4));
    const value = sentiment === "positive" ? 0.5 + s / 2 : sentiment === "negative" ? -0.5 - s / 2 : 0;
    return { id: nextId++, sentiment, value, share: (weight * 10) / (i + 3) };
  });
}

function check(dots, { width, height, maxHeight = height, shares }) {
  const result = layoutZones(dots, { width, height, maxHeight, shares, rMin: 6, rMax: 13 });
  assert.equal(result.dots.length, dots.length, "every post gets a dot");
  assert.ok(result.height >= height && result.height <= maxHeight, "the strip only grows, and not past maxHeight");
  assert.ok(Math.abs(result.zones.reduce((sum, z) => sum + z.width, 0) - width) < 0.01, "the zones fill the strip");

  const zoneOf = Object.fromEntries(result.zones.map((z) => [z.key, z]));
  result.dots.forEach((p, i) => {
    const zone = zoneOf[dots[i].sentiment];
    assert.equal(p.id, dots[i].id, "dots come back in the input's order");
    assert.ok(p.r > 0, "every dot has a size");
    assert.ok(p.x - p.r >= zone.x - 0.01 && p.x + p.r <= zone.x + zone.width + 0.01, `dot ${p.id} stays inside its ${zone.key} zone`);
    assert.ok(p.y - p.r >= 0 && p.y + p.r <= result.height, "inside the strip top to bottom");
  });
  for (let i = 0; i < result.dots.length; i++) {
    for (let j = i + 1; j < result.dots.length; j++) {
      const a = result.dots[i], b = result.dots[j];
      assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= a.r + b.r, `dots ${a.id} and ${b.id} overlap`);
    }
  }
  return result;
}

test("zones are as wide as their share, small sides keep a minimum, empty sides get nothing", () => {
  const z = zoneWidths({ negative: 2, neutral: 7, positive: 91 }, 330, 36, new Set(["negative", "neutral", "positive"]));
  assert.deepEqual(z.map((x) => x.key), ["negative", "neutral", "positive"]);
  assert.equal(z[0].width, 36);
  assert.equal(z[1].width, 36);
  assert.ok(Math.abs(z[2].width - (330 - 72)) < 0.01);

  const split = zoneWidths({ negative: 46, neutral: 11, positive: 43 }, 900, 36, new Set(["negative", "neutral", "positive"]));
  assert.ok(Math.abs(split[0].width - 414) < 0.01 && Math.abs(split[2].width - 387) < 0.01);

  const noMixed = zoneWidths({ negative: 22, neutral: 0, positive: 78 }, 900, 36, new Set(["negative", "positive"]));
  assert.equal(noMixed[1].width, 0);
});

test("a lopsided crowd fills the strip with its own side (the You Can See Everything case)", () => {
  const dots = [...side(70, "positive"), ...side(5, "neutral"), ...side(2, "negative")];
  const result = check(dots, { width: 330, height: 180, maxHeight: 300, shares: { negative: 2, neutral: 7, positive: 91 } });
  const loved = result.zones.find((z) => z.key === "positive");
  assert.ok(loved.width > 330 * 0.75, "the loved zone takes most of the strip");
  const lovedR = result.dots.filter((_, i) => dots[i].sentiment === "positive").map((p) => p.r);
  assert.ok(Math.max(...lovedR) >= 8, "and its dots stay readable");
});

test("a split crowd gets two big zones and a thin middle", () => {
  const dots = [...side(20, "negative"), ...side(5, "neutral"), ...side(20, "positive")];
  check(dots, { width: 900, height: 230, shares: { negative: 46, neutral: 11, positive: 43 } });
});

test("inside a zone, stronger opinions sit further out", () => {
  const weak = { id: nextId++, sentiment: "positive", value: 0.55, share: 5 };
  const strong = { id: nextId++, sentiment: "positive", value: 0.98, share: 5 };
  const result = layoutZones([weak, strong], { width: 900, height: 230, shares: { negative: 0, neutral: 0, positive: 100 } });
  assert.ok(result.dots[1].x > result.dots[0].x + 200);
});

test("dots stay close to their own spot", () => {
  const dots = side(40, "negative", 0.5);
  const result = check(dots, { width: 600, height: 230, shares: { negative: 100, neutral: 0, positive: 0 } });
  const zone = result.zones[0];
  const drift = zoneDrift(zone);
  // Recompute each post's spot the way the layout does (negative: stronger further left).
  result.dots.forEach((p, i) => {
    const strength = Math.min(Math.max((Math.abs(dots[i].value) - 0.5) / 0.5, 0), 1);
    const home = zone.x + zone.width - 6 - strength * (zone.width - 12);
    assert.ok(Math.abs(p.x - home) <= drift + 0.01, `dot ${p.id} drifted ${Math.abs(p.x - home).toFixed(1)} px`);
  });
});

test("a dot's size means the same in every zone", () => {
  const a = { id: nextId++, sentiment: "negative", value: -0.9, share: 5 };
  const b = { id: nextId++, sentiment: "positive", value: 0.9, share: 5 };
  const result = layoutZones([a, b, ...side(30, "positive")], { width: 600, height: 230, shares: { negative: 10, neutral: 0, positive: 90 } });
  assert.equal(result.dots[0].r, result.dots[1].r);
});

test("big crowds fit: 200 posts on desktop, 100 on a phone", () => {
  const shares = { negative: 70, neutral: 5, positive: 25 };
  check([...side(140, "negative"), ...side(10, "neutral"), ...side(50, "positive")], { width: 900, height: 230, maxHeight: 300, shares });
  check([...side(70, "negative"), ...side(5, "neutral"), ...side(25, "positive")], { width: 330, height: 180, maxHeight: 300, shares });
});

test("many mixed posts (all exactly 0) spread inside their zone", () => {
  check(side(40, "neutral"), { width: 330, height: 180, maxHeight: 300, shares: { negative: 0, neutral: 100, positive: 0 } });
});

test("when not all posts fit, each side gets dots in proportion to its share (the WARDOGS case)", () => {
  // The hated posts are each heavier, so the heaviest 100 overall would be nearly all hated.
  const hated = side(255, "negative", 0.7, 5);
  const loved = side(113, "positive", 0.7, 1);
  const all = [...hated, ...loved].sort((a, b) => b.share - a.share);
  const picked = pickDots(all, 100, { negative: 77.6, neutral: 0.1, positive: 22.3 });
  const count = (s) => picked.filter((d) => d.sentiment === s).length;
  assert.equal(picked.length, 100);
  assert.equal(count("positive"), 22);
  assert.equal(count("negative"), 78);
  assert.deepEqual(picked, all.filter((d) => picked.includes(d)), "keeps the heaviest-first order");
  const lovedPicked = picked.filter((d) => d.sentiment === "positive");
  assert.deepEqual(lovedPicked, loved.slice(0, 22), "and each side's heaviest");
});

test("a small side still gets a dot, and a side short of posts passes its room on", () => {
  const dots = [...side(50, "negative"), ...side(1, "neutral"), ...side(3, "positive")];
  const picked = pickDots(dots, 20, { negative: 60, neutral: 0.5, positive: 39.5 });
  assert.equal(picked.filter((d) => d.sentiment === "neutral").length, 1);
  assert.equal(picked.filter((d) => d.sentiment === "positive").length, 3);
  assert.equal(picked.length, 20);
  assert.equal(pickDots(dots.slice(0, 5), 20, { negative: 100 }).length, 5, "fewer posts than room: all of them");
});

test("the same input gives the same picture, and nothing gives nothing", () => {
  const dots = [...side(30, "negative"), ...side(30, "positive")];
  const box = { width: 600, height: 230, shares: { negative: 50, neutral: 0, positive: 50 } };
  assert.deepEqual(layoutZones(dots, box), layoutZones(dots, box));
  assert.deepEqual(layoutZones([], box).dots, []);
});
