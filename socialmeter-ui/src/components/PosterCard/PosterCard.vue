<script setup>
import { useRouter } from "vue-router";
import styles from "./PosterCard.module.css";

const props = defineProps({
  movie: { type: Object, required: true }
});

const router = useRouter();

function posterUrl(path) {
  return path ? `https://image.tmdb.org/t/p/w342${path}` : null;
}

function goToDetails() {
  const id = props.movie.tmdbId ?? props.movie.id;
  if (!id) return;
  router.push({ name: "movie-details", params: { id } });
}

function onWatchOptionsClick(e) {
  // Prevent clicking this button from navigating to details
  e.stopPropagation();
  // later: open a modal or dropdown
}
</script>

<template>
  <article :class="styles.card" @click="goToDetails" role="button" tabindex="0">
    <div :class="styles.frame">
      <img
        v-if="posterUrl(movie.posterPath)"
        :src="posterUrl(movie.posterPath)"
        :alt="movie.title"
        :class="styles.img"
      />
    </div>

    <div :class="styles.meta">
      <div :class="styles.rating">
        <span :class="styles.star">★</span>
        <span :class="styles.score">{{ (movie.voteAverage ?? 0).toFixed(1) }}</span>
      </div>

      <div :class="styles.title">{{ movie.title }}</div>

      <button :class="styles.btn" @click="onWatchOptionsClick">Watch options</button>
    </div>
  </article>
</template>