<template>
  <router-link class="card" :to="to">
    <img v-if="posterUrl" class="poster" :src="posterUrl" :alt="movie.title" loading="lazy" />
    <div v-else class="poster placeholder"></div>

    <div class="meta">
      <div class="title" :title="movie.title">{{ movie.title }}</div>
      <div class="sub">
        <span v-if="year">{{ year }}</span>
        <span v-if="rating">• ⭐ {{ rating }}</span>
      </div>
    </div>
  </router-link>
</template>

<script setup>
import { computed } from "vue";
import { tmdbImage } from "@/utils/tmdbImage";

const props = defineProps({
  movie: { type: Object, required: true }
});

const id = computed(() => props.movie.tmdbId ?? props.movie.id);
const to = computed(() => ({ name: "movie-details", params: { id: id.value } }));

const posterUrl = computed(() => tmdbImage(props.movie.posterPath, "w342"));
const year = computed(() => (props.movie.releaseDate ? String(props.movie.releaseDate).slice(0, 4) : ""));
const rating = computed(() => (props.movie.voteAverage ? Number(props.movie.voteAverage).toFixed(1) : ""));
</script>

<style scoped>
.card {
  display: grid;
  gap: 10px;
  text-decoration: none;
  color: inherit;
}
.poster {
  width: 100%;
  aspect-ratio: 2 / 3;
  object-fit: cover;
  border-radius: 14px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
}
.poster.placeholder {
  display: block;
}
.meta { padding: 0 2px; }
.title {
  font-weight: 600;
  font-size: 14px;
  line-height: 1.2;
  color: rgba(255,255,255,0.92);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.sub {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(255,255,255,0.65);
  display: flex;
  gap: 8px;
}
</style>
