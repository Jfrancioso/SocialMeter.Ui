<script setup>
import { computed } from "vue";
import { meterBand } from "../../utils/meter";
import styles from "./MeterBadge.module.css";

// A small copy of the hero gauge: the ring fills to the score in the band's colour, and the bolt rides the end of the arc
// the way the knob does on the big gauge. Thin readings (confidence under half) get a dashed, dimmed ring so a 52 from a
// handful of posts doesn't look as solid as a 73 from seventy. Titles with no counted posts show no badge at all.
const LOW_CONFIDENCE = 0.5;
const R = 17;
const C = 2 * Math.PI * R;

const props = defineProps({
  /** Snapshot: { score, label, totalPosts, confidence } — `null` when nothing is cached, `undefined` while unknown. */
  reading: { type: Object, default: undefined },
  size: { type: String, default: "sm" } // "sm" | "md"
});

const band = computed(() => (props.reading ? meterBand(props.reading.score, props.reading.totalPosts) : null));
const hasScore = computed(() => !!band.value && band.value.key !== "none");
const thin = computed(() => hasScore.value && (props.reading.confidence ?? 1) < LOW_CONFIDENCE);
const loading = computed(() => props.reading === undefined);

const fraction = computed(() => Math.min(1, Math.max(0, (props.reading?.score ?? 0) / 100)));
const dash = computed(() => `${(fraction.value * C).toFixed(2)} ${C.toFixed(2)}`);
// Where the arc ends, for the bolt: 0 is twelve o'clock, clockwise.
const knob = computed(() => {
  const a = fraction.value * 2 * Math.PI - Math.PI / 2;
  return { x: 22 + R * Math.cos(a), y: 22 + R * Math.sin(a) };
});

const label = computed(() => {
  if (!hasScore.value) return "";
  const r = props.reading;
  return thin.value
    ? `Chatterbub score ${r.score}, ${band.value.label}, a thin reading from ${r.totalPosts} posts`
    : `Chatterbub score ${r.score}, ${band.value.label}, from ${r.totalPosts} posts`;
});
</script>

<template>
  <span v-if="loading" :class="[styles.ring, styles[size], styles.loading]" aria-hidden="true">
    <svg viewBox="0 0 44 44"><circle cx="22" cy="22" :r="R" :class="styles.track" /></svg>
  </span>

  <span
    v-else-if="hasScore"
    :class="[styles.ring, styles[size], styles[`band-${band.key}`], thin && styles.thin]"
    role="img"
    :aria-label="label"
    :title="label"
  >
    <svg viewBox="0 0 44 44" aria-hidden="true">
      <circle cx="22" cy="22" :r="R" :class="styles.track" />
      <circle cx="22" cy="22" :r="R" :class="styles.arc" :stroke-dasharray="dash" transform="rotate(-90 22 22)" />
      <g :transform="`translate(${knob.x - 5.5} ${knob.y - 5.5})`" :class="styles.knob">
        <circle cx="5.5" cy="5.5" r="5.5" />
        <path d="M6.4 1.6 3.2 6.2h2.3l-.7 3.4L8.1 4.9H5.7z" />
      </g>
    </svg>
    <span :class="styles.score">{{ reading.score }}</span>
  </span>
</template>
