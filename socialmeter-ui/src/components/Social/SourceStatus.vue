<script setup>
import PlatformIcon from "./PlatformIcon.vue";
import styles from "./SourceStatus.module.css";

defineProps({
  /** SourceStatusDto[]: { platform, configured, fetched, error } */
  sources: { type: Array, required: true }
});

const names = { reddit: "Reddit", x: "X" };

function describe(s) {
  if (!s.configured) return "Not connected — add API credentials";
  if (s.error) return s.error;
  if (s.fetched == null) return "Connected";
  return `${s.fetched} post${s.fetched === 1 ? "" : "s"} pulled on last refresh`;
}
</script>

<template>
  <ul :class="styles.list">
    <li v-for="s in sources" :key="s.platform" :class="[styles.item, !s.configured && styles.off, s.error && styles.err]">
      <PlatformIcon :platform="s.platform" :size="18" />
      <span :class="styles.name">{{ names[s.platform] ?? s.platform }}</span>
      <span :class="styles.state">{{ describe(s) }}</span>
      <span :class="styles.dot" />
    </li>
  </ul>
</template>
