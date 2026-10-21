<script setup>
import { computed, onMounted, ref } from "vue";
import { meterBand } from "../../utils/meter";
import styles from "./MeterGauge.module.css";

const props = defineProps({
  score: { type: Number, default: null },
  totalPosts: { type: Number, default: 0 },
  label: { type: String, default: "" },
  size: { type: String, default: "lg" }, // "lg" | "md" | "sm"
  caption: { type: String, default: "" }
});

const band = computed(() => meterBand(props.score, props.totalPosts));
const hasSignal = computed(() => band.value.key !== "none");

// Semicircle centred at (110,110), radius 90, in a 220×128 box. Length = π·r.
const CX = 110;
const CY = 110;
const R = 90;
const LEN = Math.PI * R;

const mounted = ref(false);
const progress = computed(() => (mounted.value && hasSignal.value ? Math.max(0, Math.min(100, props.score)) / 100 : 0));
const dashOffset = computed(() => LEN * (1 - progress.value));

// Marker sits exactly where the filled arc ends: angle runs from 180° (score 0, left) to 0° (score 100, right).
const marker = computed(() => {
  const theta = Math.PI * (1 - progress.value);
  return { x: CX + R * Math.cos(theta), y: CY - R * Math.sin(theta) };
});

const ticks = [0, 25, 50, 75, 100].map((t) => {
  const theta = Math.PI * (1 - t / 100);
  return {
    t,
    x1: CX + (R + 12) * Math.cos(theta),
    y1: CY - (R + 12) * Math.sin(theta),
    x2: CX + (R + 18) * Math.cos(theta),
    y2: CY - (R + 18) * Math.sin(theta)
  };
});

const gradId = `meter-grad-${Math.random().toString(36).slice(2, 8)}`;

onMounted(() => requestAnimationFrame(() => (mounted.value = true)));
</script>

<template>
  <div
    :class="[styles.gauge, styles[size], styles[`band-${band.key}`]]"
    role="img"
    :aria-label="hasSignal ? `SocialMeter ${score} out of 100, ${band.label}` : 'No SocialMeter signal yet'"
  >
    <svg viewBox="0 0 220 128" :class="styles.svg">
      <defs>
        <linearGradient :id="gradId" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stop-color="var(--meter-cold)" />
          <stop offset="35%" stop-color="var(--meter-lukewarm)" />
          <stop offset="55%" stop-color="var(--meter-warm)" />
          <stop offset="78%" stop-color="var(--meter-hot)" />
          <stop offset="100%" stop-color="var(--meter-electric)" />
        </linearGradient>
      </defs>

      <!-- track -->
      <path d="M 20 110 A 90 90 0 0 1 200 110" :class="styles.track" />

      <!-- ticks -->
      <g :class="styles.ticks">
        <line v-for="k in ticks" :key="k.t" :x1="k.x1" :y1="k.y1" :x2="k.x2" :y2="k.y2" />
      </g>

      <!-- value -->
      <path
        d="M 20 110 A 90 90 0 0 1 200 110"
        :class="styles.value"
        :stroke="`url(#${gradId})`"
        :stroke-dasharray="LEN"
        :stroke-dashoffset="dashOffset"
      />

      <!-- marker at the end of the filled arc -->
      <g v-if="hasSignal" :class="styles.marker">
        <circle :cx="marker.x" :cy="marker.y" r="9" :class="styles.markerHalo" />
        <circle :cx="marker.x" :cy="marker.y" r="5" :class="styles.markerDot" />
      </g>
    </svg>

    <div :class="styles.readout">
      <div :class="styles.score">
        <template v-if="hasSignal">{{ score }}</template>
        <template v-else>—</template>
      </div>
    </div>

    <div :class="styles.under">
      <div :class="styles.label">{{ label || band.label }}</div>
      <div v-if="caption" :class="styles.caption">{{ caption }}</div>
    </div>
  </div>
</template>
