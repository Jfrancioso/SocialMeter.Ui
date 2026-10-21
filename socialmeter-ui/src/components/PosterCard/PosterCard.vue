<script setup>
import { computed } from "vue";
import { tmdbImage } from "../../utils/tmdbImage";
import { mediaLabel, yearOf } from "../../utils/format";
import { useSnapshots } from "../../composables/useSnapshots";
import MeterBadge from "../Meter/MeterBadge.vue";
import styles from "./PosterCard.module.css";

const props = defineProps({
  title: { type: Object, required: true },
  /** "row" keeps a fixed width for horizontal scrollers; "grid" fills its column. */
  layout: { type: String, default: "row" }
});

const { get } = useSnapshots();
const reading = computed(() => get(props.title.mediaType, props.title.tmdbId));
const poster = computed(() => tmdbImage(props.title.posterPath, "w342"));
const to = computed(() => ({ name: "title", params: { type: props.title.mediaType, id: props.title.tmdbId } }));
</script>

<template>
  <router-link :to="to" :class="[styles.card, layout === 'grid' && styles.grid]">
    <div :class="styles.frame">
      <img v-if="poster" :src="poster" :alt="title.name" :class="styles.img" loading="lazy" />
      <div v-else :class="styles.noPoster">{{ title.name }}</div>

      <span v-if="title.tracked === false" :class="styles.lock" title="Not tracked right now — no social reading">
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
      </span>
      <MeterBadge v-else :reading="reading" :class="styles.badge" />
      <span :class="[styles.type, title.mediaType === 'tv' && styles.typeTv]">{{ mediaLabel(title.mediaType) }}</span>
    </div>

    <div :class="styles.meta">
      <div :class="styles.name">{{ title.name }}</div>
      <div :class="styles.sub">
        <span v-if="yearOf(title.releaseDate)">{{ yearOf(title.releaseDate) }}</span>
        <span v-if="title.voteCount" :class="styles.tmdb">
          <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor" aria-hidden="true"><path d="m12 2 2.9 6.6 7.1.7-5.4 4.8 1.6 7L12 17.5 5.8 21l1.6-7L2 9.3l7.1-.7z"/></svg>
          {{ title.voteAverage.toFixed(1) }}
        </span>
      </div>
    </div>
  </router-link>
</template>
