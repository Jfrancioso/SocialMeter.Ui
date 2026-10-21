<script setup>
import styles from "./BrandLogo.module.css";

const props = defineProps({
  compact: { type: Boolean, default: false } // for future use
});
</script>

<template>
  <div :class="styles.logo" aria-label="SocialMeter">
    <div :class="styles.icon">⚡</div>
    <div :class="styles.text">SocialMeter</div>
  </div>
</template>
