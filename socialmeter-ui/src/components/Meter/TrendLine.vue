<script setup>
import { computed } from "vue";
import { meterBand } from "../../utils/meter";
import styles from "./TrendLine.module.css";

// Daily readings as dots, the smoothed line through them, and the 95 % band around each reading.
// Reconstructed days (rebuilt from post dates, not observed) are hollow.
const props = defineProps({
  points: { type: Array, default: () => [] }, // [{ day, score, margin, smoothed, reconstructed, totalPosts }]
  height: { type: Number, default: 170 },
  /** "2026-10-23": the day the scoring formula changed, if it falls inside this series. */
  methodChangedOn: { type: String, default: null }
});

const W = 640;
const PAD = { l: 30, r: 14, t: 14, b: 24 };

const days = computed(() => props.points.map((p) => new Date(`${p.day}T00:00:00Z`).getTime()));
const span = computed(() => {
  if (!days.value.length) return { min: 0, max: 1 };
  const min = Math.min(...days.value);
  const max = Math.max(...days.value);
  return { min, max: max === min ? min + 86400000 : max };
});

const x = (t) => PAD.l + ((t - span.value.min) / (span.value.max - span.value.min)) * (W - PAD.l - PAD.r);
const y = (v) => PAD.t + (1 - v / 100) * (props.height - PAD.t - PAD.b);

const dots = computed(() =>
  props.points.map((p, i) => ({
    ...p,
    cx: x(days.value[i]),
    cy: y(p.score),
    color: meterBand(p.score, p.totalPosts).color
  }))
);

const line = computed(() => dots.value.map((d, i) => `${i ? "L" : "M"}${d.cx.toFixed(1)},${y(d.smoothed).toFixed(1)}`).join(" "));

const band = computed(() => {
  if (dots.value.length < 2) return "";
  const top = dots.value.map((d) => `${d.cx.toFixed(1)},${y(Math.min(100, d.score + d.margin)).toFixed(1)}`);
  const bottom = [...dots.value].reverse().map((d) => `${d.cx.toFixed(1)},${y(Math.max(0, d.score - d.margin)).toFixed(1)}`);
  return `M${top.join(" L")} L${bottom.join(" L")} Z`;
});

const grid = [0, 25, 50, 75, 100];

// Days are UTC calendar days; format them as such or the labels slip a day west of Greenwich.
const fmt = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });
const firstLabel = computed(() => (props.points.length ? fmt.format(new Date(span.value.min)) : ""));
const lastLabel = computed(() => (props.points.length > 1 ? fmt.format(new Date(span.value.max)) : ""));

const last = computed(() => dots.value[dots.value.length - 1] ?? null);

// A dashed line where the formula changed, so a one-time step isn't read as the crowd changing its mind.
const change = computed(() => {
  if (!props.methodChangedOn || !props.points.length) return null;
  const t = new Date(`${props.methodChangedOn}T00:00:00Z`).getTime();
  if (t <= span.value.min || t > span.value.max) return null;
  const cx = x(t);
  return { cx, label: `New scoring ${fmt.format(new Date(t))}`, anchor: cx > W - 120 ? "end" : "start" };
});
</script>

<template>
  <div :class="styles.wrap">
    <svg v-if="points.length" :viewBox="`0 0 ${W} ${height}`" :class="styles.svg" role="img" :aria-label="`Score over ${points.length} days`">
      <g :class="styles.grid">
        <line v-for="g in grid" :key="g" :x1="PAD.l" :x2="W - PAD.r" :y1="y(g)" :y2="y(g)" :class="g === 50 && styles.gridMid" />
        <text v-for="g in grid" :key="`t${g}`" :x="PAD.l - 6" :y="y(g) + 3.5" text-anchor="end">{{ g }}</text>
      </g>

      <g v-if="change" :class="styles.change">
        <title>The scoring formula changed on this day: tone and approval are now blended. Earlier days used the old formula.</title>
        <line :x1="change.cx" :x2="change.cx" :y1="PAD.t" :y2="height - PAD.b" />
        <text :x="change.anchor === 'end' ? change.cx - 5 : change.cx + 5" :y="PAD.t + 9" :text-anchor="change.anchor">{{ change.label }}</text>
      </g>

      <path v-if="band" :d="band" :class="styles.band" />
      <path v-if="dots.length > 1" :d="line" :class="styles.line" />
      <line v-else-if="last" :x1="PAD.l" :x2="W - PAD.r" :y1="last.cy" :y2="last.cy" :class="styles.line" stroke-dasharray="4 6" />

      <g v-for="d in dots" :key="d.day">
        <title>{{ d.day }} · {{ d.score }} ±{{ d.margin }}{{ d.reconstructed ? " · reconstructed from post dates" : "" }}</title>
        <circle :cx="d.cx" :cy="d.cy" :r="d === last ? 5 : 3.5" :class="[styles.dot, d.reconstructed && styles.dotRebuilt]" :style="{ '--c': d.color }" />
      </g>

      <text :x="PAD.l" :y="height - 6" :class="styles.axis">{{ firstLabel }}</text>
      <text :x="W - PAD.r" :y="height - 6" text-anchor="end" :class="styles.axis">{{ lastLabel }}</text>
    </svg>
    <div v-else :class="styles.empty">No readings yet.</div>
  </div>
</template>
