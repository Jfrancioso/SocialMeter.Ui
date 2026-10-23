<script setup>
import { computed, ref } from "vue";
import { tmdbImage } from "../../utils/tmdbImage";
import { mediaLabel, yearOf } from "../../utils/format";
import { useSnapshots } from "../../composables/useSnapshots";
import MeterBadge from "../Meter/MeterBadge.vue";
import PlatformIcon from "../Social/PlatformIcon.vue";
import styles from "./PosterCard.module.css";

const props = defineProps({
  title: { type: Object, required: true },
  /** "row" keeps a fixed width for horizontal scrollers; "grid" fills its column. */
  layout: { type: String, default: "row" }
});

const { get } = useSnapshots();
const reading = computed(() => get(props.title.mediaType, props.title.tmdbId));

// Steam doesn't have portrait art for every game; when the poster 404s, show the wide header letterboxed
// over a blurred copy of itself rather than a bad 2:3 crop.
const posterFailed = ref(false);
const landscape = computed(() => posterFailed.value && !!props.title.headerImage);
const poster = computed(() =>
  posterFailed.value ? props.title.headerImage || tmdbImage(props.title.backdropPath) : tmdbImage(props.title.posterPath, "w342")
);
const to = computed(() => ({ name: "title", params: { type: props.title.mediaType, id: props.title.tmdbId } }));

// The rating under the poster is someone else's, so it says whose: TMDB's user score for movies and shows, Steam's
// all-time share of positive reviews for games (stored as a 0-10 average, shown as the percentage Steam shows).
const isGame = computed(() => props.title.mediaType === "game");
const rating = computed(() =>
  isGame.value ? `${Math.round(props.title.voteAverage * 10)}%` : props.title.voteAverage.toFixed(1)
);
const ratingSource = computed(() => (isGame.value ? "Steam reviews, all time" : "TMDB user score"));

// Crowd vs critics: when the critics' score is known (Tomatometer and Metascore averaged), it sits under the poster and the
// crowd's sits on it, so the two can be compared at a glance.
const critics = computed(() => (isGame.value ? null : reading.value?.criticsScore ?? null));
</script>

<template>
  <router-link :to="to" :class="[styles.card, layout === 'grid' && styles.grid]">
    <div :class="[styles.frame, landscape && styles.frameLandscape]">
      <div v-if="landscape" :class="styles.blur" :style="{ backgroundImage: `url(${poster})` }" />
      <img v-if="poster" :src="poster" :alt="title.name" :class="[styles.img, landscape && styles.imgLandscape]" loading="lazy" @error="posterFailed = true" />
      <div v-else :class="styles.noPoster">{{ title.name }}</div>

      <span v-if="title.tracked === false" :class="styles.lock" title="Not tracked right now — no social reading">
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
      </span>
      <MeterBadge v-else :reading="reading" :class="styles.badge" />
      <span :class="[styles.type, title.mediaType === 'tv' && styles.typeTv, title.mediaType === 'game' && styles.typeGame]">{{ mediaLabel(title.mediaType) }}</span>
    </div>

    <div :class="styles.meta">
      <div :class="styles.name">{{ title.name }}</div>
      <div :class="styles.sub">
        <span v-if="yearOf(title.releaseDate)">{{ yearOf(title.releaseDate) }}</span>
        <span v-if="critics != null" :class="styles.rating" title="Critics: Rotten Tomatoes and Metacritic averaged" :aria-label="`Critics score: ${critics}`">
          <span :class="styles.criticsMark" aria-hidden="true">CRITICS</span>
          {{ critics }}
        </span>
        <span v-else-if="title.voteCount" :class="styles.rating" :title="ratingSource" :aria-label="`${ratingSource}: ${rating}`">
          <PlatformIcon v-if="isGame" platform="steam" :size="12" />
          <span v-else :class="styles.tmdbMark" aria-hidden="true">TMDB</span>
          {{ rating }}
        </span>
      </div>
    </div>
  </router-link>
</template>
