<script setup>
import { computed } from "vue";
import styles from "./SentimentBar.module.css";

const props = defineProps({
  breakdown: { type: Object, required: true }, // { positive, neutral, negative }
  showLegend: { type: Boolean, default: true }
});

const total = computed(() => props.breakdown.positive + props.breakdown.neutral + props.breakdown.negative);
const pct = (n) => (total.value ? Math.round((n / total.value) * 100) : 0);

const segments = computed(() => [
  { key: "positive", label: "Positive", value: props.breakdown.positive, cls: styles.pos },
  { key: "neutral", label: "Neutral", value: props.breakdown.neutral, cls: styles.neu },
  { key: "negative", label: "Negative", value: props.breakdown.negative, cls: styles.neg }
]);
</script>

<template>
  <div :class="styles.wrap">
    <div :class="styles.bar" role="img" :aria-label="`${pct(breakdown.positive)}% positive, ${pct(breakdown.neutral)}% neutral, ${pct(breakdown.negative)}% negative`">
      <template v-if="total">
        <div v-for="s in segments" :key="s.key" :class="[styles.seg, s.cls]" :style="{ width: `${pct(s.value)}%` }" />
      </template>
      <div v-else :class="[styles.seg, styles.empty]" style="width: 100%" />
    </div>

    <div v-if="showLegend" :class="styles.legend">
      <div v-for="s in segments" :key="s.key" :class="styles.item">
        <span :class="[styles.dot, s.cls]" />
        <span :class="styles.itemLabel">{{ s.label }}</span>
        <span :class="styles.itemValue">{{ pct(s.value) }}%</span>
        <span :class="styles.itemCount">{{ s.value }}</span>
      </div>
    </div>
  </div>
</template>
