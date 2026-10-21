<script setup>
import { onMounted, ref } from "vue";
import { getHome } from "../api";
import { useSnapshots } from "../composables/useSnapshots";
import HeroBanner from "../components/HeroBanner/HeroBanner.vue";
import PosterRow from "../components/PosterRow/PosterRow.vue";
import styles from "./HomePage.module.css";

const { ensure } = useSnapshots();

const featured = ref(null);
const rows = ref([]);
const loading = ref(true);
const error = ref(null);

const moreFor = {
  trending: { name: "browse", params: { type: "movie" }, query: { tab: "trending" } },
  now_playing: { name: "browse", params: { type: "movie" }, query: { tab: "popular" } },
  on_the_air: { name: "browse", params: { type: "tv" }, query: { tab: "trending" } },
  popular_movies: { name: "browse", params: { type: "movie" }, query: { tab: "popular" } },
  popular_tv: { name: "browse", params: { type: "tv" }, query: { tab: "popular" } },
  top_games: { name: "browse", params: { type: "game" }, query: { tab: "trending" } },
  most_played: { name: "browse", params: { type: "game" }, query: { tab: "popular" } }
};

const bands = [
  { label: "Cold", range: "0–34", color: "var(--meter-cold)" },
  { label: "Lukewarm", range: "35–49", color: "var(--meter-lukewarm)" },
  { label: "Warm", range: "50–64", color: "var(--meter-warm)" },
  { label: "Hot", range: "65–79", color: "var(--meter-hot)" },
  { label: "Electric", range: "80–100", color: "var(--meter-electric)" }
];

onMounted(async () => {
  try {
    const data = await getHome("US");
    featured.value = data.featured;
    rows.value = data.rows;
    ensure(data.rows.flatMap((r) => r.items));
  } catch (e) {
    error.value = e?.message ?? String(e);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div :class="styles.page">
    <div class="container">
      <template v-if="loading">
        <div :class="[styles.heroSkeleton, 'skeleton']" />
        <div v-for="i in 3" :key="i" :class="styles.rowSkeleton">
          <div :class="[styles.rowTitleSkeleton, 'skeleton']" />
          <div :class="styles.rowCards">
            <div v-for="j in 8" :key="j" :class="[styles.cardSkeleton, 'skeleton']" />
          </div>
        </div>
      </template>

      <div v-else-if="error" class="error-box">
        Couldn’t reach the SocialMeter API.
        {{ error }}
      </div>

      <template v-else>
        <HeroBanner v-if="featured" :title="featured" />

        <section :class="styles.legend" aria-label="How the meter reads">
          <div :class="styles.legendIntro">
            <strong>The meter</strong>
            <span>
              We read Reddit and X, score every post’s tone, and weigh it by engagement and how real the account is. 50 is perfectly split.
              <router-link :to="{ name: 'how-it-works' }" :class="styles.legendLink">How it works →</router-link>
            </span>
          </div>
          <ul :class="styles.bands">
            <li v-for="b in bands" :key="b.label" :class="styles.band" :style="{ '--c': b.color }">
              <span :class="styles.bandDot" />
              <span :class="styles.bandLabel">{{ b.label }}</span>
              <span :class="styles.bandRange">{{ b.range }}</span>
            </li>
          </ul>
        </section>

        <PosterRow
          v-for="row in rows"
          :key="row.key"
          :title="row.title"
          :subtitle="row.subtitle"
          :items="row.items"
          :more-to="moreFor[row.key] ?? null"
        />
      </template>
    </div>
  </div>
</template>
