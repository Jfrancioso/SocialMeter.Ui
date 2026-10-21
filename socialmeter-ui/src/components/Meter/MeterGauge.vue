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

// Semicircle: radius 90 in a 220×124 box. Length = π·r.
const R = 90;
const LEN = Math.PI * R;
const mounted = ref(false);
const progress = computed(() => (mounted.value && hasSignal.value ? Math.max(0, Math.min(100, props.score)) / 100 : 0));
const dashOffset = computed(() => LEN * (1 - progress.value));

// Needle angle: 0 → 180° (left), 100 → 0° (right)
const needle = computed(() => 180 - progress.value * 180);

const gradId = `meter-grad-${Math.random().toString(36).slice(2, 8)}`;

onMounted(() => requestAnimationFrame(() => (mounted.value = true)));
</script>

<template>
  <div :class="[styles.gauge, styles[size], styles[`band-${band.key}`]]" role="img" :aria-label="hasSignal ? `SocialMeter ${score} out of 100, ${band.label}` : 'No SocialMeter signal yet'">
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
      <path d="M 20 110 A 90 90 0 0 1 200 110" :class="styles.track" pathLength="100" />

      <!-- ticks -->
      <g :class="styles.ticks">
        <line v-for="t in [0, 25, 50, 75, 100]" :key="t"
          :x1="110 + 102 * Math.cos(Math.PI - (t / 100) * Math.PI)"
          :y1="110 - 102 * Math.sin(Math.PI - (t / 100) * Math.PI)"
          :x2="110 + 108 * Math.cos(Math.PI - (t / 100) * Math.PI)"
          :y2="110 - 108 * Math.sin(Math.PI - (t / 100) * Math.PI)" />
      </g>

      <!-- value -->
      <path
        d="M 20 110 A 90 90 0 0 1 200 110"
        :class="styles.value"
        :stroke="`url(#${gradId})`"
        :stroke-dasharray="LEN"
        :stroke-dashoffset="dashOffset"
      />

      <!-- needle -->
      <g :class="styles.needle" :style="{ transform: `rotate(${needle}deg)` }">
        <line x1="-40" y1="0" x2="-76" y2="0" />
        <circle cx="0" cy="0" r="5" />
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
