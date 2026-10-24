/**
 * Lays out "The crowd" (the Crowd Shape pilot): one dot per post, placed left to right by the post's value
 * (-1 hated it ... +1 loved it, the score's own per-post formula), sized by its share of the score, and packed so no
 * two overlap. Each dot goes to the free spot nearest its own value: straight up or down first, then a little to the
 * side when that column is full, so a crowd of identical values (every neutral post is exactly 0) spreads into a blob
 * instead of a tower. Every dot is placed: if they still don't fit, every radius shrinks 10% and the layout is redone.
 * Pure: same input, same picture.
 *
 * @param {{ id: number, value: number, share: number }[]} dots
 * @param {{ width: number, height: number, pad?: number, rMin?: number, rMax?: number }} box
 * @returns {{ id: number, x: number, y: number, r: number }[]} centres and radii, in the input's order
 */
export function layoutCrowd(dots, { width, height, pad = 16, rMin = 5, rMax = 17 }) {
  if (!dots.length || width <= 2 * pad) return [];

  // Dots can't cover much more than about 40% of the strip and still pack, so size them to that up front; a failed
  // try costs nearly a whole layout, and without this a 300-post title took several.
  const maxShare = Math.max(...dots.map((d) => d.share), 0.0001);
  const area = dots.reduce((sum, d) => sum + Math.PI * (rMin + (rMax - rMin) * Math.sqrt(d.share / maxShare) + GAP / 2) ** 2, 0);
  const budget = 0.4 * width * height;
  if (area > budget) {
    const k = Math.sqrt(budget / area);
    rMin *= k;
    rMax *= k;
  }

  for (let shrink = 0; shrink < 20; shrink++) {
    const placed = tryLayout(dots, width, height, pad, rMin, rMax);
    if (placed) return placed;
    rMin *= 0.9;
    rMax *= 0.9;
  }
  return [];
}

/** X position of a score (0-100) on the same scale as the dots. */
export function scoreX(score, width, pad = 16) {
  return pad + (score / 100) * (width - 2 * pad);
}

const GAP = 1.2;          // px between neighbouring dots
const STEP_Y = 1.5;       // px per vertical search step
const MAX_SHIFTS = 120;   // sideways tries, each half a radius further out

function tryLayout(dots, width, height, pad, rMin, rMax) {
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
    // A small fixed spread so posts with the same value don't all start from one point.
    const jitter = ((((rank * 37) % 11) - 5) / 5) * rMax * 0.6;
    const x0 = Math.min(Math.max(pad + ((d.value + 1) / 2) * (width - 2 * pad) + jitter, r), width - r);

    let spot = null;
    for (let shift = 0; shift < MAX_SHIFTS && !spot; shift++) {
      const x = x0 + Math.ceil(shift / 2) * r * 0.5 * (shift % 2 ? 1 : -1);
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
    if (!spot) return null;   // didn't fit: the caller shrinks everything and tries again

    const dot = { id: d.id, x: spot.x, y: spot.y, r };
    const k = key(Math.floor(dot.x / cell), Math.floor(dot.y / cell));
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(dot);
    out[order[rank]] = dot;
  }
  return out;
}
