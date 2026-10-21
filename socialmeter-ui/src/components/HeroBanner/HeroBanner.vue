<script setup>
import { computed, onMounted, ref } from "vue";
import { getSocialMeter } from "../../api";
import { tmdbImage } from "../../utils/tmdbImage";
import { mediaLabel, yearOf } from "../../utils/format";
import { useSnapshots } from "../../composables/useSnapshots";
import MeterGauge from "../Meter/MeterGauge.vue";
import styles from "./HeroBanner.module.css";

const props = defineProps({
  title: { type: Object, required: true }
});

const { set } = useSnapshots();
const meter = ref(null);
const loadingMeter = ref(true);

const backdrop = computed(() => tmdbImage(props.title.backdropPath, "w1280"));
const poster = computed(() => tmdbImage(props.title.posterPath, "w342"));
const to = computed(() => ({ name: "title", params: { type: props.title.mediaType, id: props.title.tmdbId } }));

const caption = computed(() => {
  if (!meter.value) return "";
  const n = meter.value.totalPosts;
  return n ? `${n} post${n === 1 ? "" : "s"} measured` : "No posts measured yet";
});

onMounted(async () => {
  try {
    const data = await getSocialMeter(props.title.mediaType, props.title.tmdbId);
    meter.value = data.meter;
    set(props.title.mediaType, props.title.tmdbId, data.meter);
  } catch {
    meter.value = null;
  } finally {
    loadingMeter.value = false;
  }
});
</script>

<template>
  <section :class="styles.hero">
    <div :class="styles.bg" :style="backdrop ? { backgroundImage: `url(${backdrop})` } : null" />
    <div :class="styles.shade" />

    <div :class="styles.content">
      <img v-if="poster" :src="poster" :alt="title.name" :class="styles.poster" />

      <div :class="styles.text">
        <div :class="styles.badges">
          <span :class="styles.trending">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M13.5 2s.5 3.5-2 6.5S8 13 8 13s-1-1.5-1-3c-2.5 2-4 5-4 7.5A7.5 7.5 0 0 0 10.5 22 8.5 8.5 0 0 0 19 13.5c0-4.5-3-8-5.5-11.5Z"/></svg>
            Trending #1
          </span>
          <span :class="styles.kind">{{ mediaLabel(title.mediaType) }}</span>
          <span v-if="yearOf(title.releaseDate)" :class="styles.year">{{ yearOf(title.releaseDate) }}</span>
        </div>

        <h1 :class="styles.title">{{ title.name }}</h1>
        <p :class="styles.overview">{{ title.overview }}</p>

        <div :class="styles.genres">
          <span v-for="g in title.genres.slice(0, 4)" :key="g" :class="styles.genre">{{ g }}</span>
        </div>

        <div :class="styles.actions">
          <router-link :to="to" class="btn btn-primary">Read the pulse</router-link>
          <router-link :to="to" class="btn">Details</router-link>
        </div>
      </div>

      <div :class="styles.meterCol">
        <div :class="styles.meterCard">
          <div :class="styles.meterTitle">SocialMeter</div>
          <div v-if="loadingMeter" :class="[styles.meterSkeleton, 'skeleton']" />
          <MeterGauge v-else :score="meter?.score" :total-posts="meter?.totalPosts ?? 0" :label="meter?.label" size="md" :caption="caption" />
        </div>
      </div>
    </div>
  </section>
</template>
