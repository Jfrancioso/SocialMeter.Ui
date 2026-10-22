<script setup>
import { computed } from "vue";
import { meterBand } from "../../utils/meter";
import styles from "./RatingsStrip.module.css";

const props = defineProps({
  /** The Chatterbub reading: { score, label, totalPosts, confidenceLabel } or null while loading */
  meter: { type: Object, default: null },
  /** ExternalRating[] from /ratings, or null while loading */
  ratings: { type: Array, default: null },
  criticsAverage: { type: Number, default: null },
  /** What criticsAverage is: "critics" for films and shows, "Steam all-time" for games. */
  baselineLabel: { type: String, default: "critics" }
});

const band = computed(() => (props.meter ? meterBand(props.meter.score, props.meter.totalPosts) : null));
const hasSignal = computed(() => band.value && band.value.key !== "none");

const gap = computed(() => {
  if (!hasSignal.value || props.criticsAverage == null) return null;
  return props.meter.score - props.criticsAverage;
});

const isGame = computed(() => props.baselineLabel === "Steam all-time");

const gapText = computed(() => {
  if (gap.value == null) return "";
  if (isGame.value) {
    if (Math.abs(gap.value) < 5) return "Players right now agree with Steam's all-time verdict";
    return gap.value > 0
      ? `Players right now are ${gap.value} points warmer than Steam's all-time verdict`
      : `Players right now are ${-gap.value} points cooler than Steam's all-time verdict`;
  }
  if (Math.abs(gap.value) < 5) return "Fans and critics agree";
  return gap.value > 0 ? `Fans are ${gap.value} points warmer than the critics` : `Critics are ${-gap.value} points warmer than the fans`;
});

const gapMeta = computed(() => (isGame.value ? `Steam all-time ${props.criticsAverage}` : `critics avg ${props.criticsAverage}`));

const logos = {
  tmdb: "TMDB",
  imdb: "IMDb",
  rottenTomatoes: "RT",
  metacritic: "MC",
  steam: "STEAM",
  steamRecent: "30D"
};
</script>

<template>
  <section :class="styles.strip">
    <div :class="[styles.card, styles.social, band && styles[`band-${band.key}`]]">
      <div :class="styles.source">
        <svg viewBox="0 0 64 64" width="14" height="14" aria-hidden="true"><path d="M36 6 L16 36 h14 l-4 22 L50 26 H36 Z" fill="currentColor" /></svg>
        Chatterbub
      </div>
      <div v-if="!meter" :class="[styles.valueSkeleton, 'skeleton']" />
      <template v-else>
        <div :class="styles.value">
          <template v-if="hasSignal">{{ meter.score }}</template>
          <template v-else>—</template>
        </div>
        <div :class="styles.detail">
          <template v-if="hasSignal">{{ band.label }} · {{ meter.totalPosts }} posts · {{ meter.confidenceLabel }} confidence</template>
          <template v-else>No posts measured yet</template>
        </div>
      </template>
    </div>

    <template v-if="ratings">
      <a
        v-for="r in ratings"
        :key="r.source"
        :class="[styles.card, !r.available && styles.unavailable]"
        :href="r.url ?? undefined"
        :target="r.url ? '_blank' : undefined"
        rel="noopener"
      >
        <div :class="styles.source">
          <span :class="[styles.logo, styles[`logo-${r.source}`]]">{{ logos[r.source] ?? r.displayName }}</span>
          {{ r.displayName }}
        </div>
        <div :class="styles.value">{{ r.available ? r.value : "—" }}</div>
        <div :class="styles.detail">{{ r.detail }}</div>
        <div v-if="r.available" :class="styles.track"><div :class="styles.fill" :style="{ width: `${r.normalized}%` }" /></div>
        <span v-if="r.url" :class="styles.verify">Verify on {{ r.displayName }} ↗</span>
      </a>
    </template>
    <template v-else>
      <div v-for="i in 4" :key="i" :class="[styles.card, 'skeleton']" />
    </template>

    <div v-if="gapText" :class="styles.gap">
      <span :class="styles.gapDot" />
      {{ gapText }}
      <span v-if="criticsAverage != null" :class="styles.gapMeta">{{ gapMeta }}</span>
    </div>
  </section>
</template>
