<script setup>
import { computed } from "vue";
import { tmdbImage } from "../../utils/tmdbImage";
import styles from "./MovieHero.module.css";

const props = defineProps({
  movie: { type: Object, required: true },
});

const posterUrl = computed(() => tmdbImage(props.movie.posterPath, "w342"));
const backdropUrl = computed(() => tmdbImage(props.movie.backdropPath, "w1280"));

const year = computed(() =>
  props.movie.releaseDate ? String(props.movie.releaseDate).slice(0, 4) : ""
);

const rating = computed(() =>
  props.movie.voteAverage != null ? Number(props.movie.voteAverage).toFixed(1) : ""
);
</script>

<template>
  <section :class="styles.hero">
    <div
      v-if="backdropUrl"
      :class="styles.backdrop"
      :style="{ backgroundImage: `url(${backdropUrl})` }"
    />
    <div :class="styles.overlay" />

    <div :class="styles.inner">
      <img
        v-if="posterUrl"
        :class="styles.poster"
        :src="posterUrl"
        :alt="movie.title"
      />

      <div :class="styles.text">
        <h1 :class="styles.title">{{ movie.title }}</h1>

        <div :class="styles.meta">
          <span v-if="year">{{ year }}</span>
          <span v-if="rating">• ★ {{ rating }}</span>
          <span v-if="movie.releaseDate">• {{ movie.releaseDate }}</span>
        </div>
      </div>
    </div>
  </section>
</template>
