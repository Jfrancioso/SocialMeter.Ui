<script setup>
import { computed } from "vue";
import { meterBand } from "../../utils/meter";
import styles from "./MeterBadge.module.css";

const props = defineProps({
  /** Snapshot: { score, label, totalPosts } — `null` when nothing is cached, `undefined` while unknown. */
  reading: { type: Object, default: undefined },
  size: { type: String, default: "sm" } // "sm" | "md"
});

const band = computed(() => (props.reading ? meterBand(props.reading.score, props.reading.totalPosts) : null));
const title = computed(() =>
  band.value && band.value.key !== "none"
    ? `Chatterbub score ${props.reading.score} · ${band.value.label} · ${props.reading.totalPosts} posts`
    : "No Chatterbub score yet. Open the title to take one."
);
</script>

<template>
  <span :class="[styles.badge, styles[size], band && styles[`band-${band.key}`], !band && styles.pending]" :title="title">
    <svg viewBox="0 0 64 64" :class="styles.bolt" aria-hidden="true">
      <path d="M36 6 L16 36 h14 l-4 22 L50 26 H36 Z" fill="currentColor" />
    </svg>
    <span v-if="band && band.key !== 'none'">{{ reading.score }}</span>
    <span v-else :class="styles.dash">—</span>
  </span>
</template>
