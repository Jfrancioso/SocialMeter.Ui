import { test } from "node:test";
import assert from "node:assert/strict";
import { areaPath, linePath, linePoints, nearestIndex, recentChange, timeLabel } from "./pulseLine.js";

const box = { left: 20, top: 10, width: 300, height: 100 };
const start = Date.parse("2026-10-24T01:00:00Z");
// The API's moments: "at" without a zone is UTC, as the API sends it.
const moment = (minute, mood, sentiment = "positive") => ({
  at: new Date(start + minute * 60_000).toISOString().replace("Z", ""),
  mood,
  sentiment,
  platform: "x"
});

test("one even step per post, whenever it was posted, with the mood setting the height", () => {
  // Two posts a day apart, then three a minute apart: the burst still gets its share of the width.
  const points = linePoints([moment(0, 100), moment(1440, 50), moment(1441, 0), moment(1442, 50), moment(1443, 75)], box);

  assert.deepEqual(points.map((p) => p.x), [20, 95, 170, 245, 320]);
  assert.deepEqual(points.map((p) => p.y), [10, 60, 110, 60, 35]);
  assert.equal(points[0].at, start);
  assert.deepEqual(linePoints([], box), []);
  assert.equal(linePoints([moment(0, 50)], box)[0].x, 320);   // a single post sits at the latest end
});

test("the paths go through every point, and the area closes down to the bottom", () => {
  const points = linePoints([moment(0, 100), moment(1, 0)], box);

  assert.equal(linePath(points), "M20.0 10.0L320.0 110.0");
  assert.equal(areaPath(points, 110), "M20.0 10.0L320.0 110.0L320.0 110L20.0 110Z");
  assert.equal(areaPath([], 110), "");
});

test("the hover finds the nearest post and stays on the line past either end", () => {
  const points = linePoints([0, 1, 2, 3, 4].map((m) => moment(m, 50)), box);   // x = 20, 95, 170, 245, 320

  assert.equal(nearestIndex(points, 100), 1);
  assert.equal(nearestIndex(points, 140), 2);
  assert.equal(nearestIndex(points, -50), 0);
  assert.equal(nearestIndex(points, 999), 4);
  assert.equal(nearestIndex([], 10), -1);
});

test("the change is over the hour before the latest post, and only when the line reaches back that far", () => {
  const points = linePoints([moment(0, 40), moment(30, 45), moment(90, 70), moment(100, 52)], box);

  // The latest post is at minute 100; the last moment at or before minute 40 is minute 30's.
  assert.deepEqual(recentChange(points), { change: 7, since: start + 30 * 60_000 });
  assert.equal(recentChange(linePoints([moment(0, 40), moment(20, 60)], box)), null);
  assert.equal(recentChange([]), null);
});

test("times say the day only when it isn't today", () => {
  const now = Date.now();

  assert.match(timeLabel(now, now), /^\d{1,2}:\d\d [AP]M$/);
  assert.match(timeLabel(now - 3 * 86_400_000, now), /^[A-Z][a-z]{2} \d{1,2}:\d\d [AP]M$/);
});
