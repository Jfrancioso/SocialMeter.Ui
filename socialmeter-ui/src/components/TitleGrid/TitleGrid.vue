<script setup>
import PosterCard from "../PosterCard/PosterCard.vue";
import styles from "./TitleGrid.module.css";

defineProps({
  items: { type: Array, required: true }
});
</script>

<template>
  <div :class="styles.grid">
    <PosterCard v-for="t in items" :key="`${t.mediaType}-${t.tmdbId}`" :title="t" layout="grid" />
  </div>
</template>
