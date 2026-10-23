<script setup>
import { computed, ref, toRef, watch } from "vue";
import { tmdbImage } from "../utils/tmdbImage";
import { mediaLabel, runtimeLabel, yearOf } from "../utils/format";
import { useTitlePage } from "../composables/useTitlePage";
import { useDevicePref } from "../composables/useDevicePref";
import RatingsStrip from "../components/Ratings/RatingsStrip.vue";
import MeterCard from "../components/Title/MeterCard.vue";
import WhyThisScore from "../components/Title/WhyThisScore.vue";
import SocialPulse from "../components/Title/SocialPulse.vue";
import TrailerDialog from "../components/Title/TrailerDialog.vue";
import styles from "./TitlePage.module.css";

// Layout and the hero. Data lives in useTitlePage; each section below is its own component.
const props = defineProps({
  type: { type: String, required: true },
  id: { type: Number, required: true }
});

const page = useTitlePage(() => ({ type: props.type, id: props.id }));
const {
  title, ratings, social, explain, history, loading, notFound, error, refreshing, slowLoad,
  feed, feedPage, feedTotalPages, feedLoading, sentimentFilter, platformFilter,
  meter, anyPosts, configuredSources, locked, trackedReason, trendFact, refreshWaitMinutes, refreshHint,
  refresh, loadMore, setFilter
} = page;

// Spoiler shield: on by default; the reader's choice is remembered on this device only.
const { value: shield, toggle: toggleShield } = useDevicePref("sm:spoilerShield", true);

const overviewOpen = ref(false);

// The trailer only loads when this opens; moving to another title closes it.
const trailerOpen = ref(false);
watch(() => [props.type, props.id], () => (trailerOpen.value = false));
watch(toRef(props, "id"), () => (overviewOpen.value = false));

const backdrop = computed(() => tmdbImage(title.value?.backdropPath, "w1280"));

// Steam portrait art is missing for some games; fall back to the (guaranteed) header image.
const posterFailed = ref(false);
watch(title, () => (posterFailed.value = false));
const poster = computed(() =>
  posterFailed.value ? title.value?.headerImage || tmdbImage(title.value?.backdropPath) : tmdbImage(title.value?.posterPath, "w500")
);
const posterLandscape = computed(() => posterFailed.value && !!title.value?.headerImage);

const metaBits = computed(() => {
  const t = title.value;
  if (!t) return [];
  const bits = [mediaLabel(t.mediaType)];
  if (yearOf(t.releaseDate)) bits.push(yearOf(t.releaseDate));
  if (t.mediaType === "tv") {
    if (t.seasonCount) bits.push(`${t.seasonCount} season${t.seasonCount === 1 ? "" : "s"}`);
    if (t.episodeCount) bits.push(`${t.episodeCount} episodes`);
  } else if (t.mediaType === "game") {
    if (t.developer) bits.push(t.developer);
    if (t.platforms?.length) bits.push(t.platforms.join(" · "));
  } else if (t.runtimeMinutes) {
    bits.push(runtimeLabel(t.runtimeMinutes));
  }
  if (t.status && t.status !== "Released") bits.push(t.status);
  return bits;
});
</script>

<template>
  <div :class="styles.page">
    <div v-if="loading" class="container">
      <div :class="[styles.heroSkeleton, 'skeleton']" />
    </div>

    <div v-else-if="notFound" class="container">
      <div :class="styles.notFound">
        <h1>Nothing here</h1>
        <p>That title doesn’t exist on TMDB, or the link is off.</p>
        <router-link to="/" class="btn btn-primary">Back home</router-link>
      </div>
    </div>

    <div v-else-if="error" class="container">
      <div class="error-box">{{ error }}</div>
    </div>

    <template v-else>
      <div :class="styles.backdrop" :style="backdrop ? { backgroundImage: `url(${backdrop})` } : null">
        <div :class="styles.backdropShade" />
      </div>

      <div class="container">
        <header :class="styles.hero">
          <img v-if="poster" :src="poster" :alt="title.name" :class="[styles.poster, posterLandscape && styles.posterLandscape]" @error="posterFailed = true" />
          <div v-else :class="[styles.poster, styles.posterEmpty]" />

          <div :class="styles.heroText">
            <div :class="styles.meta">
              <span v-for="(b, i) in metaBits" :key="i" :class="[styles.metaBit, i === 0 && styles.metaKind]">{{ b }}</span>
              <span v-if="trackedReason" :class="styles.trackedChip" :title="`Chatterbub is measuring this title right now: ${trackedReason}`">
                <span :class="styles.trackedDot" />
                Tracking · {{ trackedReason }}
              </span>
              <span v-else-if="locked" :class="styles.lockedChip" title="Not in the tracked set right now, so no new posts are pulled">
                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
                Not tracked right now
              </span>
            </div>
            <h1 :class="styles.name">{{ title.name }}</h1>
            <p v-if="title.tagline" :class="styles.tagline">{{ title.tagline }}</p>

            <div :class="styles.genres">
              <span v-for="g in title.genres" :key="g" :class="styles.genre">{{ g }}</span>
            </div>

            <div v-if="title.trailer" :class="styles.heroActions">
              <button type="button" class="btn" @click="trailerOpen = true">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" /></svg>
                Play trailer
              </button>
            </div>
            <TrailerDialog
              :open="trailerOpen"
              :trailer="title.trailer"
              :title-name="title.name"
              :steam-app-id="type === 'game' ? id : null"
              @close="trailerOpen = false"
            />

            <p :class="[styles.overview, overviewOpen && styles.overviewOpen]">
              {{ title.overview || "No overview available." }}
            </p>
            <button v-if="title.overview?.length > 320" type="button" :class="styles.readMore" @click="overviewOpen = !overviewOpen">
              {{ overviewOpen ? "Less" : "More" }}
            </button>
          </div>

          <aside :class="styles.heroMeter">
            <MeterCard
              :title="title"
              :ratings="ratings"
              :social="social"
              :meter="meter"
              :locked="locked"
              :any-posts="anyPosts"
              :slow-load="slowLoad"
              :refreshing="refreshing"
              :refresh-wait-minutes="refreshWaitMinutes"
              :configured-sources="configuredSources"
              :refresh-hint="refreshHint"
              :trend-fact="trendFact"
              @refresh="refresh"
            />
          </aside>
        </header>

        <section :class="styles.section">
          <div :class="styles.sectionHead">
            <h2 :class="styles.h2">Ratings, side by side</h2>
            <span :class="styles.sectionSub">
              {{ type === "game" ? "The Chatterbub score is players right now; Steam's numbers are the all-time and 30-day consensus." : "Everything on a 0–100 scale so the fan pulse and the critics line up." }}
            </span>
          </div>
          <RatingsStrip :meter="meter" :ratings="ratings?.ratings ?? null" :critics-average="ratings?.criticsAverage ?? null" :baseline-label="ratings?.baselineLabel ?? 'critics'" />
        </section>

        <section v-if="anyPosts" :class="styles.section">
          <WhyThisScore :meter="meter" :explain="explain" :history="history" :shielded="shield" :trend-fact="trendFact" />
        </section>

        <section :class="styles.section">
          <div :class="styles.sectionHead">
            <h2 :class="styles.h2">The social pulse</h2>
            <span :class="styles.sectionSub">What people are actually saying, weighted by how much the crowd agreed with them.</span>
          </div>
          <SocialPulse
            :type="type"
            :social="social"
            :meter="meter"
            :locked="locked"
            :any-posts="anyPosts"
            :configured-sources="configuredSources"
            :feed="feed"
            :feed-page="feedPage"
            :feed-total-pages="feedTotalPages"
            :feed-loading="feedLoading"
            :sentiment-filter="sentimentFilter"
            :platform-filter="platformFilter"
            :shielded="shield"
            @filter="setFilter"
            @load-more="loadMore"
            @toggle-shield="toggleShield"
          />
        </section>
      </div>
    </template>
  </div>
</template>
