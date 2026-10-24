<script setup>
import { computed, ref } from "vue";
import { meterBand } from "../../utils/meter";
import { platformName } from "../../utils/platforms";
import { areaPath, linePath, linePoints, nearestIndex, recentChange, timeLabel } from "../../utils/pulseLine";
import { useElementWidth } from "../../composables/useElementWidth";
import { useInView } from "../../composables/useInView";
import styles from "./PulseLine.module.css";

// The crowd over time: one step per post, in the order they were posted, at the mood of the latest dozen posts
// (CrowdShapeRules.TimelineWindow on the API, which builds the line), so it bounces like a stock chart. During a live
// event the page checks back every couple of minutes (useTitlePage); new posts extend the line and the ping moves.
const props = defineProps({
  timeline: { type: Array, required: true },
  hours: { type: Number, default: 48 },
  live: { type: Boolean, default: false },
  liveLabel: { type: String, default: "" },
  /** The Chatterbub score, drawn as a faint line for comparison. */
  score: { type: Number, default: null }
});

const uid = `pulse${Math.random().toString(36).slice(2, 8)}`;

// ---- layout: measured width, fixed height per breakpoint ----
const box = ref(null);
const width = useElementWidth(box);
const narrow = computed(() => width.value > 0 && width.value < 560);
const height = computed(() => (narrow.value ? 130 : 160));
// The plot area inside the SVG: the scale on the left, room for the ping on the right, a row of post ticks underneath.
const plot = computed(() => ({ left: 26, top: 10, width: Math.max(0, width.value - 26 - 12), height: height.value - 10 - 20 }));
const bottom = computed(() => plot.value.top + plot.value.height);
const y = (mood) => plot.value.top + (1 - mood / 100) * plot.value.height;

const points = computed(() => (width.value ? linePoints(props.timeline, plot.value) : []));
const line = computed(() => linePath(points.value));
const area = computed(() => areaPath(points.value, bottom.value));
const last = computed(() => points.value.at(-1) ?? null);
const GRID = [75, 50, 25];

// The line's colour follows the meter's bands by height: loved-it pink at the top, hated-it blue at the bottom.
const STOPS = [
  [0.1, "var(--meter-electric)"],
  [0.28, "var(--meter-hot)"],
  [0.43, "var(--meter-warm)"],
  [0.58, "var(--meter-lukewarm)"],
  [0.8, "var(--meter-cold)"]
];
// The post ticks under the line use the site's opinion colours (tokens.css), like the crowd's zones.
const TICK = { positive: "var(--loved)", neutral: "var(--mixed)", negative: "var(--hated)" };
const SAID = { positive: "loved it", neutral: "mixed", negative: "hated it" };

// ---- the readout: the latest post, or the one under the pointer ----
// The page's one headline number is the score. The line is a different measure (the latest posts only), so the readout
// says where it sits against the score, the dashed line, instead of showing a second number on the same 0-100 scale:
// "73" beside a score of 69 read as if the score had changed.
const hover = ref(-1);
function onMove(e) {
  hover.value = nearestIndex(points.value, e.clientX - e.currentTarget.getBoundingClientRect().left);
}
const shown = computed(() => points.value[hover.value] ?? last.value);
const shownColor = computed(() => (shown.value ? meterBand(shown.value.mood).color : null));

// Up (warmer) takes the loved-it colour and down (colder) the hated-it colour, as in the crowd's zones.
const UP = TICK.positive;
const DOWN = TICK.negative;
const versus = computed(() => {
  const p = shown.value;
  if (!p) return { text: "" };
  if (props.score == null) return { text: `${p.mood} out of 100` };
  const gap = p.mood - props.score;
  if (Math.abs(gap) <= 1) return { text: "in line with the score" };
  return { text: `${Math.abs(gap)} ${gap > 0 ? "above" : "below"} the score`, color: gap > 0 ? UP : DOWN };
});
const change = computed(() => recentChange(points.value));
const trend = computed(() => {
  const c = change.value;
  if (!c) return null;
  if (c.change === 0) return { text: "No change in the last hour" };
  return { arrow: `${c.change > 0 ? "▲" : "▼"} ${Math.abs(c.change)}`, text: "in the last hour", color: c.change > 0 ? UP : DOWN };
});
const detail = computed(() => {
  const p = shown.value;
  if (!p) return "";
  return hover.value >= 0 ? `After a “${SAID[p.sentiment] ?? "mixed"}” post on ${platformName(p.platform)}` : `Latest post ${timeLabel(p.at)}`;
});

const first = computed(() => points.value[0] ?? null);
const ariaLabel = computed(() =>
  first.value && last.value && props.score != null
    ? `The mood of the latest posts, post by post, against the score of ${props.score}: ${first.value.mood} at ${timeLabel(first.value.at)}, ${last.value.mood} at ${timeLabel(last.value.at)}.`
    : "The mood of the latest posts, post by post."
);

// ---- entrance: the line draws itself the first time it scrolls into view (reduced motion: it's just there) ----
const inView = useInView(box, { threshold: 0.4 });
const reduceMotion = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const drawn = computed(() => reduceMotion || inView.value);
</script>

<template>
  <div :class="styles.pulse">
    <div :class="styles.head">
      <div :class="styles.title">
        <span v-if="live" :class="styles.live"><span :class="styles.liveDot" aria-hidden="true" />Live</span>
        <span :class="styles.label">{{ live && liveLabel ? liveLabel : `The last ${hours} hours` }}</span>
      </div>
      <div v-if="shown" :class="styles.now" aria-live="off">
        <strong :class="styles.nowMain">
          {{ hover >= 0 ? timeLabel(shown.at) : "Latest posts" }}:
          <span :style="{ color: versus.color }">{{ versus.text }}</span>
        </strong>
        <span v-if="hover < 0 && trend" :class="styles.nowDetail">
          <strong v-if="trend.arrow" :style="{ color: trend.color }">{{ trend.arrow }}</strong>
          {{ trend.text }}
        </span>
        <span v-else :class="styles.nowDetail">{{ detail }}</span>
      </div>
    </div>

    <div ref="box" :class="[styles.chart, drawn ? styles.drawn : styles.waiting]">
      <svg
        v-if="width"
        :width="width"
        :height="height"
        :viewBox="`0 0 ${width} ${height}`"
        role="img"
        :aria-label="ariaLabel"
        @pointermove="onMove"
        @pointerleave="hover = -1"
      >
        <defs>
          <linearGradient :id="`${uid}-mood`" gradientUnits="userSpaceOnUse" x1="0" x2="0" :y1="y(100)" :y2="y(0)">
            <stop v-for="[offset, color] in STOPS" :key="offset" :offset="offset" :style="{ stopColor: color }" />
          </linearGradient>
        </defs>

        <g :class="styles.grid" aria-hidden="true">
          <template v-for="g in GRID" :key="g">
            <line :x1="plot.left" :x2="plot.left + plot.width" :y1="y(g)" :y2="y(g)" :class="g === 50 && styles.mid" />
            <text :x="plot.left - 6" :y="y(g) + 3.5" text-anchor="end">{{ g }}</text>
          </template>
        </g>

        <line v-if="score != null" :class="styles.scoreLine" :x1="plot.left" :x2="plot.left + plot.width" :y1="y(score)" :y2="y(score)" aria-hidden="true" />

        <path :class="styles.area" :d="area" :fill="`url(#${uid}-mood)`" />
        <path :class="styles.line" :d="line" :stroke="`url(#${uid}-mood)`" pathLength="1" />

        <!-- Drawn after the line so the line never covers it. -->
        <text v-if="score != null" :class="styles.scoreLabel" :x="plot.left + 4" :y="y(score) - 4" aria-hidden="true">Score {{ score }}</text>

        <!-- One tick per post, coloured by what it said: the posts coming in. -->
        <g aria-hidden="true">
          <line
            v-for="(p, i) in points"
            :key="i"
            :class="styles.tick"
            :x1="p.x"
            :x2="p.x"
            :y1="bottom + 8"
            :y2="bottom + 15"
            :style="{ stroke: TICK[p.sentiment] ?? TICK.neutral }"
          />
        </g>

        <g v-if="hover >= 0 && shown" :class="styles.cross" aria-hidden="true">
          <line :x1="shown.x" :x2="shown.x" :y1="plot.top" :y2="bottom" />
          <circle :cx="shown.x" :cy="shown.y" r="4" :style="{ fill: shownColor }" />
        </g>

        <g v-if="last" :class="styles.ping" aria-hidden="true">
          <circle v-if="live" :class="styles.ring" :cx="last.x" :cy="last.y" r="4" :style="{ stroke: meterBand(last.mood).color }" />
          <circle :cx="last.x" :cy="last.y" r="4" :style="{ fill: meterBand(last.mood).color }" />
        </g>
      </svg>
    </div>

    <div v-if="first && last" :class="styles.axis" aria-hidden="true">
      <span>{{ timeLabel(first.at) }}</span>
      <span>{{ points.length }} posts</span>
      <span>{{ timeLabel(last.at) }}</span>
    </div>

    <p :class="styles.caption">
      Each step is a post, in the order they were posted. The line is the mood of the latest dozen posts; the dashed line
      is the score, which takes every post and so moves more slowly.{{ live ? " New posts appear here as we read them, no reload needed." : "" }}
    </p>
  </div>
</template>
