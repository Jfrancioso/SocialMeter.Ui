/**
 * Lays out "The crowd" in three zones, Hated it | Mixed | Loved it, each as wide as its share of the score's weight: a
 * title 91% loved gives its loved posts 91% of the strip (with one linear scale, they had a quarter of it and became a
 * thin column of tiny dots). Inside a zone, stronger opinions sit further out: the most hated posts at the far left, the
 * most loved at the far right, mixed ones in the middle of theirs. Every post is a dot sized by its share of the score,
 * packed so none overlap, none leaves its zone and none lands further than its zone's drift from its own spot. Pure:
 * same input, same picture. Tested in crowdLayout.test.js.
 *
 * One size scale for all three zones (the most crowded one decides), so a dot's size means the same everywhere. A
 * crowded strip first grows taller, up to maxHeight, so the dots stay readable; then the dots shrink.
 *
 * @param {{ id: number, value: number, share: number, sentiment: string }[]} dots  value -1..+1, share 0-100
 * @param {{ width: number, height: number, maxHeight?: number, shares: { negative: number, neutral: number, positive: number },
 *           rMin?: number, rMax?: number, minZone?: number }} box  shares: percent of the weight, from every counted post
 * @returns {{ dots: { id: number, x: number, y: number, r: number }[], height: number,
 *             zones: { key: string, x: number, width: number, share: number }[] }}  dots in the input's order
 */
export function layoutZones(dots, { width, height, maxHeight = height, shares, rMin = 5, rMax = 17, minZone = 36 }) {
  if (!dots.length || width <= 0) return { dots: [], height, zones: [] };

  const zones = zoneWidths(shares, width, minZone, new Set(dots.map((d) => d.sentiment)));
  const maxShare = Math.max(...dots.map((d) => d.share), 0.0001);
  const groups = zones
    .filter((z) => z.width > 0)
    .map((z) => ({ zone: z, members: dots.map((d, i) => ({ d, i, home: homeX(d, z) })).filter((m) => m.d.sentiment === z.key) }))
    .filter((g) => g.members.length);

  const scale = (h) => Math.min(1, ...groups.map((g) => crowdingScale(g, h, rMin, rMax, maxShare)));
  let k = scale(height);
  if (k < GROW_BELOW && maxHeight > height) {
    // The room in a zone grows with the height, and the radius with its square root.
    height = Math.round(Math.min(maxHeight, height * (GROW_BELOW / k) ** 2));
    k = scale(height);
  }

  const out = new Array(dots.length);
  for (const g of groups) {
    packZone(g, height, rMin * k, rMax * k, maxShare).forEach((p, j) => (out[g.members[j].i] = p));
  }
  return { dots: out, height, zones };
}

/**
 * The dots to draw when not all fit: each side's heaviest, in proportion to its share of the weight, so the dots tell
 * the same story as the shares (the heaviest posts overall can all come from one side). Every side with posts gets one
 * first, then each next dot goes to the side with the most share per dot (the D'Hondt method). The API's
 * CrowdShapeRules.DotsPerSide follows the same rule. Keeps the input's order (heaviest first).
 *
 * @param {{ sentiment: string, share: number }[]} dots  heaviest first
 * @param {number} max
 * @param {{ negative: number, neutral: number, positive: number }} shares  percent of the weight
 */
export function pickDots(dots, max, shares) {
  if (dots.length <= max) return dots;
  const count = Object.fromEntries(ZONES.map((key) => [key, dots.filter((d) => d.sentiment === key).length]));
  const given = Object.fromEntries(ZONES.map((key) => [key, 0]));
  const open = ZONES.filter((key) => count[key] > 0);
  const share = (key) => Math.max(0, shares?.[key] ?? 0);

  let left = max;
  for (const key of [...open].sort((a, b) => share(b) - share(a))) {
    if (left === 0) break;
    given[key] = 1;
    left--;
  }
  while (left > 0) {
    const room = open.filter((key) => given[key] < count[key]);
    if (!room.length) break;
    const next = room.reduce((a, b) => (share(b) / (given[b] + 1) > share(a) / (given[a] + 1) ? b : a));
    given[next]++;
    left--;
  }

  const taken = Object.fromEntries(ZONES.map((key) => [key, 0]));
  return dots.filter((d) => taken[d.sentiment] < given[d.sentiment] && ++taken[d.sentiment]);
}

/** X position of a score (0-100) across the whole strip, for the score line. */
export function scoreX(score, width) {
  return (score / 100) * width;
}

/** The zones in order, left to right, with the post sentiment each holds. */
export const ZONES = ["negative", "neutral", "positive"];

const GAP = 1.2;        // px between neighbouring dots
const STEP_Y = 1.5;     // px per vertical search step
const PACKING = 0.5;    // share of a stretch that round dots packed this way can fill
const GROW_BELOW = 0.8; // grow the strip when crowding would shrink the dots below 80% of their size
const INSET = 6;        // px kept clear inside each zone's edges

/** How far (px) a dot may land from its spot: 12% of its zone (mixed posts may use the whole of theirs). */
export function zoneDrift(zone) {
  return zone.key === "neutral" ? zone.width / 2 : Math.max(6, 0.12 * zone.width);
}

/**
 * Zone widths from the shares: each side with posts drawn gets at least minZone so it stays visible and tappable, a side
 * with none gets nothing, and the rest of the width is split by share.
 */
export function zoneWidths(shares, width, minZone, present) {
  const live = ZONES.filter((key) => present.has(key));
  const share = (key) => Math.max(0, shares?.[key] ?? 0);
  const widths = Object.fromEntries(ZONES.map((key) => [key, 0]));

  if (live.length * minZone >= width) {
    live.forEach((key) => (widths[key] = width / live.length));
  } else {
    // Sides too small for minZone get minZone; the others share what is left by share. Two rounds settle it.
    const pinned = new Set();
    for (let round = 0; round < live.length; round++) {
      const free = live.filter((key) => !pinned.has(key));
      const freeWidth = width - pinned.size * minZone;
      const freeShare = free.reduce((sum, key) => sum + share(key), 0);
      const proposed = (key) => (freeShare > 0 ? (share(key) / freeShare) * freeWidth : freeWidth / free.length);
      const tooSmall = free.filter((key) => proposed(key) < minZone);
      if (!tooSmall.length) {
        free.forEach((key) => (widths[key] = proposed(key)));
        break;
      }
      tooSmall.forEach((key) => pinned.add(key));
    }
    pinned.forEach((key) => (widths[key] = minZone));
  }

  let x = 0;
  return ZONES.map((key) => {
    const zone = { key, x, width: widths[key], share: share(key) };
    x += widths[key];
    return zone;
  });
}

/** Where a post sits in its zone: how strongly it leans (0-1) decides how far out. */
function homeX(d, zone) {
  const inner = Math.max(zone.width - 2 * INSET, 0);
  if (zone.key === "neutral") return zone.x + zone.width / 2;
  // A positive post's value is 0.5 + tone / 2, a negative one's -0.5 + tone / 2 (the score's own formula).
  const strength = Math.min(Math.max((Math.abs(d.value) - 0.5) / 0.5, 0), 1);
  return zone.key === "positive" ? zone.x + INSET + strength * inner : zone.x + zone.width - INSET - strength * inner;
}

/** Radius factor (at most 1) that lets this zone's most crowded stretch, two drifts wide, hold its dots. */
function crowdingScale(group, height, rMin, rMax, maxShare) {
  const drift = zoneDrift(group.zone);
  const room = Math.min(2 * drift, group.zone.width) * height * PACKING;
  const area = (m) => Math.PI * (rMin + (rMax - rMin) * Math.sqrt(m.d.share / maxShare) + GAP / 2) ** 2;
  let k = 1;
  for (const m of group.members) {
    let need = 0;
    for (const n of group.members) if (Math.abs(n.home - m.home) <= drift) need += area(n);
    if (need > room) k = Math.min(k, Math.sqrt(room / need));
  }
  return k;
}

/** Packs one zone; if it doesn't fit, its dots shrink 10% and it is redone (every dot is always placed). */
function packZone(group, height, rMin, rMax, maxShare) {
  for (let shrink = 0; shrink < 30; shrink++) {
    const placed = tryPack(group, height, rMin, rMax, maxShare);
    if (placed) return placed;
    rMin *= 0.9;
    rMax *= 0.9;
  }
  return group.members.map((m) => ({ id: m.d.id, x: m.home, y: height / 2, r: 0 }));   // unreachable in practice
}

function tryPack({ zone, members }, height, rMin, rMax, maxShare) {
  const drift = zoneDrift(zone);
  const left = zone.x;
  const right = zone.x + zone.width;
  // Heaviest first, so the big dots sit on the centre line and the small ones fill in around them.
  const order = members.map((m, j) => j).sort((a, b) => members[b].d.share - members[a].d.share);
  const out = new Array(members.length);
  const mid = height / 2;

  // Placed dots by grid cell, so each check looks only at the neighbouring cells.
  const cell = 2 * rMax + GAP;
  const grid = new Map();
  const key = (cx, cy) => `${cx},${cy}`;
  const fits = (x, y, r) => {
    const cx = Math.floor(x / cell);
    const cy = Math.floor(y / cell);
    for (let i = cx - 1; i <= cx + 1; i++) {
      for (let j = cy - 1; j <= cy + 1; j++) {
        for (const q of grid.get(key(i, j)) ?? []) {
          if ((x - q.x) ** 2 + (y - q.y) ** 2 < (r + q.r + GAP) ** 2) return false;
        }
      }
    }
    return true;
  };

  for (let rank = 0; rank < order.length; rank++) {
    const m = members[order[rank]];
    const r = rMin + (rMax - rMin) * Math.sqrt(m.d.share / maxShare);
    // A small fixed spread so posts with the same value don't all start from one point (well inside the drift).
    const jitter = ((((rank * 37) % 11) - 5) / 5) * Math.min(rMax * 0.6, drift / 2);
    const x0 = m.home + jitter;
    const step = Math.max(r * 0.5, 1);

    let spot = null;
    for (let shift = 0; !spot; shift++) {
      const offset = Math.ceil(shift / 2) * step;
      if (offset > drift + Math.abs(jitter)) break;   // both sides tried
      const x = x0 + offset * (shift % 2 ? 1 : -1);
      if (Math.abs(x - m.home) > drift || x - r < left || x + r > right) continue;
      for (let s = 0; ; s++) {
        const dy = Math.ceil(s / 2) * STEP_Y;
        if (dy + r > mid - 2) break;   // past the top and bottom edges: this column is full
        const y = mid + (s % 2 ? dy : -dy);
        if (fits(x, y, r)) {
          spot = { x, y };
          break;
        }
      }
    }
    if (!spot) return null;   // no room near its spot: the caller shrinks this zone and tries again

    const dot = { id: m.d.id, x: spot.x, y: spot.y, r };
    const k = key(Math.floor(dot.x / cell), Math.floor(dot.y / cell));
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(dot);
    out[order[rank]] = dot;
  }
  return out;
}
