<script setup>
import { computed } from "vue";
import styles from "./ShareBar.module.css";

// A stacked bar of weight shares (already in percent) with a legend. Used for "weight by sentiment" and "weight by substance".
const props = defineProps({
  segments: { type: Array, required: true } // [{ key, label, value (0–100), color, hint? }]
});

const total = computed(() => props.segments.reduce((a, s) => a + (s.value || 0), 0));
</script>

<template>
  <div :class="styles.wrap">
    <div :class="styles.bar" role="img" :aria-label="segments.map((s) => `${s.label} ${Math.round(s.value)}%`).join(', ')">
      <template v-if="total">
        <div v-for="s in segments" :key="s.key" :class="styles.seg" :style="{ width: `${s.value}%`, background: s.color }" />
      </template>
      <div v-else :class="[styles.seg, styles.empty]" style="width: 100%" />
    </div>
    <div :class="styles.legend">
      <div v-for="s in segments" :key="s.key" :class="styles.item" :title="s.hint || ''">
        <span :class="styles.dot" :style="{ background: s.color }" />
        <span :class="styles.label">{{ s.label }}</span>
        <span :class="styles.value">{{ Math.round(s.value) }}%</span>
      </div>
    </div>
  </div>
</template>
