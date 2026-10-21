<template>
  <div class="grid">
    <MovieCard v-for="m in movies" :key="m.tmdbId ?? m.id" :movie="m" />
  </div>
</template>

<script setup>
import MovieCard from "@/components/movies/MovieCard.vue";

defineProps({
  movies: { type: Array, default: () => [] }
});
</script>

<style scoped>
.grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
}
@media (min-width: 900px) {
  .grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
}
</style>
