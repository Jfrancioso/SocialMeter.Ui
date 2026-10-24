/**
 * Lays out "The crowd": one dot per post, placed left to right by the post's value (-1 hated it ... +1 loved it, the
 * score's own per-post formula), sized by its share of the score, and packed so no two overlap. Pure: same input, same
 * picture. Tested in crowdLayout.test.js.
 *
 * The rule that keeps the chart honest: a dot lands at most MAX_DRIFT (4% of the scale, about 4 points) from where its
 * value says. It goes straight up or down from that spot first, then a little to the side, never further. So the dots
 * are sized for the most crowded stretch of the strip, not the strip as a whole: when nearly everyone loved a title,
 * every dot has to fit in the "loved it" end (without this, loved posts once spilled into the middle and looked mixed).
 * A crowded strip first grows taller, up to maxHeight, so the dots stay readable; then the dots shrink. If they still
 * don't fit, every radius shrinks 10% and the layout is redone; every dot is always placed.
 *
 * @param {{ id: number, value: number, share: number }[]} dots
 * @param {{ width: number, height: number, maxHeight?: number, pad?: number, rMin?: number, rMax?: number }} box
 * @returns {{ dots: { id: number, x: number, y: number, r: number }[], height: number }} centres and radii in the
 *   input's order, and the height the strip needs
 */
export function layoutCrowd(dots, { width, height, maxHeight = height, pad = 16, rMin = 5, rMax = 17 }) {
  if (!dots.length || width <= 2 * pad) return { dots: [], height };

  const drift = maxDrift(width, pad);
  let k = crowdingScale(dots, width, height, pad, rMin, rMax, drift);
  if (k < GROW_BELOW && maxHeight > height) {
    // The room a stretch offers grows with the height, and the radius with its square root.
    height = Math.round(Math.min(maxHeight, height * (GROW_BELOW / k) ** 2));
    k = crowdingScale(dots, width, height, pad, rMin, rMax, drift);
  }
  rMin *= k;
  rMax *= k;

  for (let shrink = 0; shrink < 30; shrink++) {
    const placed = tryLayout(dots, width, height, pad, rMin, rMax, drift);
    if (placed) return { dots: placed, height };
    rMin *= 0.9;
    rMax *= 0.9;
  }
  return { dots: [], height };
}

/** X position of a score (0-100) on the same scale as the dots. */
export function scoreX(score, width, pad = 16) {
  return pad + (score / 100) * (width - 2 * pad);
}

/** Where a value (-1..+1) sits on the strip. */
export function valueX(value, width, pad = 16) {
  return pad + ((value + 1) / 2) * (width - 2 * pad);
}

/** How far (px) a dot may land from its value's spot: 4% of the scale. */
export function maxDrift(width, pad = 16) {
  return 0.04 * (width - 2 * pad);
}

const GAP = 1.2;        // px between neighbouring dots
const STEP_Y = 1.5;     // px per vertical search step
const PACKING = 0.5;    // share of a stretch that round dots packed this way can fill
const GROW_BELOW = 0.8; // grow the strip when crowding would shrink the dots below 80% of their size

/** Radius factor (at most 1) that lets the most crowded stretch, two drifts wide, hold its dots. */
function crowdingScale(dots, width, height, pad, rMin, rMax, drift) {
  const maxShare = Math.max(...dots.map((d) => d.share), 0.0001);
  const xs = dots.map((d) => valueX(d.value, width, pad));
  const areas = dots.map((d) => Math.PI * (rMin + (rMax - rMin) * Math.sqrt(d.share / maxShare) + GAP / 2) ** 2);
  const room = 2 * drift * height * PACKING;
  let k = 1;
  for (const x of xs) {
    let need = 0;
    for (let j = 0; j < xs.length; j++) if (Math.abs(xs[j] - x) <= drift) need += areas[j];
    if (need > room) k = Math.min(k, Math.sqrt(room / need));
  }
  return k;
}

function tryLayout(dots, width, height, pad, rMin, rMax, drift) {
  const maxShare = Math.max(...dots.map((d) => d.share), 0.0001);
  // Heaviest first, so the big dots sit on the centre line and the small ones fill in around them.
  const order = dots.map((d, i) => i).sort((a, b) => dots[b].share - dots[a].share);
  const out = new Array(dots.length);
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
    const d = dots[order[rank]];
    const r = rMin + (rMax - rMin) * Math.sqrt(d.share / maxShare);
    const home = valueX(d.value, width, pad);
    // A small fixed spread so posts with the same value don't all start from one point (well inside the drift).
    const jitter = ((((rank * 37) % 11) - 5) / 5) * Math.min(rMax * 0.6, drift / 2);
    const x0 = home + jitter;

    let spot = null;
    for (let shift = 0; !spot; shift++) {
      const x = x0 + Math.ceil(shift / 2) * Math.max(r * 0.5, 1) * (shift % 2 ? 1 : -1);
      if (Math.abs(x - home) > drift) {
        if (Math.ceil(shift / 2) * Math.max(r * 0.5, 1) > drift + Math.abs(jitter)) break;   // both sides tried
        continue;
      }
      if (x - r < 0 || x + r > width) continue;
      for (let step = 0; ; step++) {
        const dy = Math.ceil(step / 2) * STEP_Y;
        if (dy + r > mid - 2) break;   // past the top and bottom edges: this column is full
        const y = mid + (step % 2 ? dy : -dy);
        if (fits(x, y, r)) {
          spot = { x, y };
          break;
        }
      }
    }
    if (!spot) return null;   // no room near its value: the caller shrinks everything and tries again

    const dot = { id: d.id, x: spot.x, y: spot.y, r };
    const k = key(Math.floor(dot.x / cell), Math.floor(dot.y / cell));
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(dot);
    out[order[rank]] = dot;
  }
  return out;
}
