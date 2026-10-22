<script setup>
import { computed } from "vue";
import { useDevicePref } from "../../composables/useDevicePref";
import ScoreExplain from "../Social/ScoreExplain.vue";
import styles from "./WhyThisScore.module.css";

// A disclosure around the maths. Collapsed by default with a one-line summary, because most readers want the posts;
// the choice is remembered on the device.
const props = defineProps({
  meter: { type: Object, default: null },
  explain: { type: Object, default: null },
  history: { type: Object, default: null },
  shielded: { type: Boolean, default: true },
  trendFact: { type: Object, default: null }
});

const { value: open, toggle } = useDevicePref("sm:whyOpen", false);

const summary = computed(() => {
  const m = props.meter;
  if (!m?.stats) return "";
  const bits = [`${m.score} ±${m.stats.margin}`, `${m.stats.effectivePosts} effective posts`, `${m.confidenceLabel} confidence`];
  if (props.trendFact) bits.push(props.trendFact.text.toLowerCase());
  return bits.join(" · ");
});
</script>

<template>
  <div>
    <button type="button" :class="[styles.disclosure, open && styles.open]" :aria-expanded="open" aria-controls="why-this-score" @click="toggle">
      <span :class="styles.chevron" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6" /></svg>
      </span>
      <span :class="styles.text">
        <h2 :class="styles.h2">Why this score</h2>
        <span v-if="!open" :class="styles.sub">{{ summary }}</span>
        <span v-else :class="styles.sub">Every number here can be recomputed from the posts below.</span>
      </span>
      <span :class="styles.hint">{{ open ? "Hide the maths" : "Show the maths" }}</span>
    </button>

    <div v-show="open" id="why-this-score" :class="styles.body">
      <ScoreExplain :explain="explain" :history="history" :shielded="shielded" />
      <p :class="styles.foot">
        <router-link :to="{ name: 'how-it-works', hash: '#method' }" :class="styles.link">How every one of these numbers is computed →</router-link>
      </p>
    </div>
  </div>
</template>
