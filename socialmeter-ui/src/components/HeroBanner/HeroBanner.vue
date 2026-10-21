<script setup>
import styles from "./HeroBanner.module.css";

defineProps({
  movie: { type: Object, required: true }
});

function posterUrl(path) {
  return path ? `https://image.tmdb.org/t/p/w342${path}` : null;
}
function backdropUrl(path) {
  return path ? `https://image.tmdb.org/t/p/w1280${path}` : null;
}
</script>

<template>
  <!-- OUTER WRAPPER = glow (not clipped) -->
  <section :class="styles.heroOuter">
    <!-- INNER CARD = rounded + clipped -->
    <div :class="[styles.heroInner, styles.heroHot]">
      <div
        :class="styles.bg"
        :style="{
          backgroundImage: `linear-gradient(
            to right,
            rgba(0,0,0,.92) 0%,
            rgba(0,0,0,.75) 35%,
            rgba(0,0,0,.35) 60%,
            rgba(0,0,0,.15) 100%
          ), url(${backdropUrl(movie.backdropPath)})`
        }"
      />

      <div :class="styles.content">
        <img
          v-if="posterUrl(movie.posterPath)"
          :src="posterUrl(movie.posterPath)"
          :alt="movie.title"
          :class="styles.poster"
        />

        <div :class="styles.text">
          <div :class="styles.badges">
            <span :class="styles.hot">HOT</span>
            <span :class="styles.type">{{ movie.mediaType?.toUpperCase?.() }}</span>
          </div>

          <div :class="styles.title">{{ movie.title }}</div>
          <div :class="styles.overview">{{ movie.overview }}</div>

          <div :class="styles.actions">
            <button :class="styles.btnPrimary">▶ Trailer</button>
            <button :class="styles.btnGhost">Watch options</button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
