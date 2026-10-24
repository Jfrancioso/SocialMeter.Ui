import { parseUtc } from "./format.js";

// The crowd's line over time (PulseLine.vue), as pure functions so the tests can pin them down. The API builds the
// moments (CrowdShapeRules.Timeline): one per post, in the order they were posted, each at the mood of the latest posts.

/**
 * Where each moment goes in the plot area `{ left, top, width, height }`: one even step per post, like a trading "tick
 * chart", so a burst of posts during a live event gets room instead of being squeezed into its few minutes of a two-day
 * axis. The mood sets the height, 100 at the top.
 */
export function linePoints(timeline, { left, top, width, height }) {
  const n = timeline?.length ?? 0;
  return (timeline ?? []).map((m, i) => ({
    x: left + (n > 1 ? i / (n - 1) : 1) * width,
    y: top + (1 - Math.min(Math.max(m.mood, 0), 100) / 100) * height,
    at: parseUtc(m.at).getTime(),
    mood: m.mood,
    sentiment: m.sentiment,
    platform: m.platform
  }));
}

/** An SVG path through the points in straight steps (the stock-chart look). */
export const linePath = (points) => points.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join("");

/** The same path closed down to `bottom`, for the shading under the line. */
export const areaPath = (points, bottom) =>
  points.length ? `${linePath(points)}L${points.at(-1).x.toFixed(1)} ${bottom}L${points[0].x.toFixed(1)} ${bottom}Z` : "";

/** The index of the point nearest to x (the steps are even, so no search is needed); -1 when there are none. */
export function nearestIndex(points, x) {
  const n = points.length;
  if (n < 2) return n - 1;
  const step = (points[n - 1].x - points[0].x) / (n - 1);
  return Math.min(n - 1, Math.max(0, Math.round((x - points[0].x) / step)));
}

/**
 * How far the mood moved over the `windowMs` (an hour) before the latest post: `{ change, since }`, or null when the
 * line doesn't reach back that far.
 */
export function recentChange(points, windowMs = 60 * 60 * 1000) {
  const last = points.at(-1);
  if (!last) return null;
  let before = null;
  for (const p of points) {
    if (p.at > last.at - windowMs) break;
    before = p;
  }
  return before ? { change: last.mood - before.mood, since: before.at } : null;
}

/** "9:42 PM" today, "Thu 9:42 PM" on another day, in the reader's own time zone. */
export function timeLabel(ms, now = Date.now()) {
  const d = new Date(ms);
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return d.toDateString() === new Date(now).toDateString() ? time : `${d.toLocaleDateString("en-US", { weekday: "short" })} ${time}`;
}
