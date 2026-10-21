<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { getRatings, getSocialMeter, getSocialPosts, getTitle } from "../api";
import { tmdbImage } from "../utils/tmdbImage";
import { formatNumber, mediaLabel, runtimeLabel, timeAgo, yearOf } from "../utils/format";
import { meterBand } from "../utils/meter";
import { useSnapshots } from "../composables/useSnapshots";
import MeterGauge from "../components/Meter/MeterGauge.vue";
import SentimentBar from "../components/Meter/SentimentBar.vue";
import RatingsStrip from "../components/Ratings/RatingsStrip.vue";
import PostCard from "../components/Social/PostCard.vue";
import SourceStatus from "../components/Social/SourceStatus.vue";
import styles from "./TitlePage.module.css";

const props = defineProps({
  type: { type: String, required: true },
  id: { type: Number, required: true }
});

const { set } = useSnapshots();

const title = ref(null);
const ratings = ref(null);
const social = ref(null);
const loading = ref(true);
const notFound = ref(false);
const error = ref(null);
const refreshing = ref(false);
const overviewOpen = ref(false);

// feed
const feed = ref([]);
const feedPage = ref(1);
const feedTotalPages = ref(0);
const feedLoading = ref(false);
const sentimentFilter = ref("");
const platformFilter = ref("");

// Spoiler shield: on by default; the reader's choice is remembered on this device only.
const SHIELD_KEY = "sm:spoilerShield";
const shield = ref(readShield());

function readShield() {
  try {
    return localStorage.getItem(SHIELD_KEY) !== "off";
  } catch {
    return true;
  }
}

function toggleShield() {
  shield.value = !shield.value;
  try {
    localStorage.setItem(SHIELD_KEY, shield.value ? "on" : "off");
  } catch {
    // storage unavailable (private window etc.) — the toggle still works for this page
  }
}

let controller = null;

const backdrop = computed(() => tmdbImage(title.value?.backdropPath, "w1280"));

// Steam portrait art is missing for some games; fall back to the (guaranteed) header image.
const posterFailed = ref(false);
const poster = computed(() =>
  posterFailed.value ? title.value?.headerImage || tmdbImage(title.value?.backdropPath) : tmdbImage(title.value?.posterPath, "w500")
);
const posterLandscape = computed(() => posterFailed.value && !!title.value?.headerImage);
const meter = computed(() => social.value?.meter ?? null);
const band = computed(() => (meter.value ? meterBand(meter.value.score, meter.value.totalPosts) : null));
const hasSignal = computed(() => band.value && band.value.key !== "none");

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

const momentumText = computed(() => {
  const m = meter.value?.momentum;
  if (m == null) return null;
  if (Math.abs(m) < 3) return { text: "Holding steady", dir: "flat" };
  return m > 0 ? { text: `Rising · +${m} in the last two weeks`, dir: "up" } : { text: `Cooling · ${m} in the last two weeks`, dir: "down" };
});

const configuredSources = computed(() => (social.value?.sources ?? []).filter((s) => s.configured));
const anyPosts = computed(() => (meter.value?.totalPosts ?? 0) > 0);

// Locked titles are outside the tracked set: no pulls, no spend. A leftover reading may still exist from
// when the title was tracked, and we show it labelled as such rather than pretending it is current.
const locked = computed(() => social.value != null && social.value.tracked === false);
const trackedReason = computed(() => social.value?.trackedReason ?? title.value?.trackedReason ?? null);

// A live pull spends X credits, and the API refuses a second one inside its cool-down; say so on the button.
const now = ref(Date.now());
setInterval(() => (now.value = Date.now()), 30_000);

const refreshWaitMinutes = computed(() => {
  const at = social.value?.nextRefreshAllowedAt;
  if (!at) return 0;
  const ms = new Date(at.endsWith("Z") ? at : `${at}Z`).getTime() - now.value;
  return ms > 0 ? Math.ceil(ms / 60_000) : 0;
});

const refreshHint = computed(() => {
  if (!social.value) return "";
  if (locked.value) return "";
  if (configuredSources.value.length === 0) return "No source connected — nothing to pull yet.";
  if (refreshWaitMinutes.value > 0) return `Live pull available again in ${refreshWaitMinutes.value} min`;
  const names = configuredSources.value.map((s) => (s.platform === "x" ? "X" : "Reddit")).join(" and ");
  return `Pulls new posts from ${names}${configuredSources.value.some((s) => s.platform === "x") ? " · uses X API credits" : ""}`;
});

async function load() {
  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;

  loading.value = true;
  notFound.value = false;
  error.value = null;
  title.value = null;
  ratings.value = null;
  social.value = null;
  posterFailed.value = false;
  feed.value = [];
  feedPage.value = 1;
  overviewOpen.value = false;
  sentimentFilter.value = "";
  platformFilter.value = "";

  try {
    title.value = await getTitle(props.type, props.id, { signal });
  } catch (e) {
    if (e?.name === "AbortError") return;
    if (e?.status === 404) notFound.value = true;
    else error.value = e?.message ?? String(e);
    loading.value = false;
    return;
  }
  loading.value = false;

  // The rest streams in behind the hero.
  getRatings(props.type, props.id, { signal })
    .then((r) => (ratings.value = r))
    .catch(() => (ratings.value = { ratings: [], criticsAverage: null }));

  loadSocial(false, signal);
}

async function loadSocial(refresh, signal) {
  if (refresh) refreshing.value = true;
  try {
    const data = await getSocialMeter(props.type, props.id, { refresh }, { signal });
    social.value = data;
    set(props.type, props.id, data.meter);
    await loadFeed(1, signal);
  } catch (e) {
    if (e?.name !== "AbortError") social.value = { meter: null, sources: [], error: e?.message ?? String(e) };
  } finally {
    refreshing.value = false;
  }
}

async function loadFeed(page, signal) {
  feedLoading.value = true;
  try {
    const data = await getSocialPosts(
      props.type,
      props.id,
      { sentiment: sentimentFilter.value || undefined, platform: platformFilter.value || undefined, page, pageSize: 12 },
      { signal }
    );
    feed.value = page === 1 ? data.items : [...feed.value, ...data.items];
    feedPage.value = data.page;
    feedTotalPages.value = data.totalPages;
  } catch (e) {
    if (e?.name !== "AbortError" && page === 1) feed.value = [];
  } finally {
    feedLoading.value = false;
  }
}

function setFilter(kind, value) {
  if (kind === "sentiment") sentimentFilter.value = sentimentFilter.value === value ? "" : value;
  else platformFilter.value = platformFilter.value === value ? "" : value;
  loadFeed(1, controller?.signal);
}

watch(() => [props.type, props.id], load, { immediate: true });
onBeforeUnmount(() => controller?.abort());

const sentimentChips = [
  { value: "positive", label: "Positive" },
  { value: "neutral", label: "Neutral" },
  { value: "negative", label: "Negative" }
];
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
      <!-- Backdrop -->
      <div :class="styles.backdrop" :style="backdrop ? { backgroundImage: `url(${backdrop})` } : null">
        <div :class="styles.backdropShade" />
      </div>

      <div class="container">
        <!-- Hero -->
        <header :class="styles.hero">
          <img v-if="poster" :src="poster" :alt="title.name" :class="[styles.poster, posterLandscape && styles.posterLandscape]" @error="posterFailed = true" />
          <div v-else :class="[styles.poster, styles.posterEmpty]" />

          <div :class="styles.heroText">
            <div :class="styles.meta">
              <span v-for="(b, i) in metaBits" :key="i" :class="[styles.metaBit, i === 0 && styles.metaKind]">{{ b }}</span>
              <span v-if="trackedReason" :class="styles.trackedChip" :title="`SocialMeter is measuring this title right now: ${trackedReason}`">
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

            <p :class="[styles.overview, overviewOpen && styles.overviewOpen]">
              {{ title.overview || "No overview available." }}
            </p>
            <button v-if="title.overview?.length > 320" type="button" :class="styles.readMore" @click="overviewOpen = !overviewOpen">
              {{ overviewOpen ? "Less" : "More" }}
            </button>
          </div>

          <aside :class="styles.heroMeter">
            <div :class="styles.meterCard">
              <div :class="styles.meterHead">
                <span :class="styles.meterTitle">SocialMeter</span>
                <span v-if="social?.lastRefreshedAt && !(locked && !anyPosts)" :class="styles.meterWhen">updated {{ timeAgo(social.lastRefreshedAt) }}</span>
              </div>
              <div v-if="!social" :class="[styles.gaugeSkeleton, 'skeleton']" />

              <template v-else-if="locked && !anyPosts">
                <div :class="styles.lockedPanel">
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
                  <strong>Not tracked right now</strong>
                  <span>SocialMeter measures what people are talking about today: titles in theaters, on the air, trending, this season’s picks, and anything that’s gone electric. This one isn’t on that list at the moment, so there’s no reading.</span>
                  <router-link :to="{ name: 'how-it-works' }" :class="styles.lockedLink">How tracking works →</router-link>
                </div>
              </template>

              <MeterGauge v-else :score="meter?.score" :total-posts="meter?.totalPosts ?? 0" :label="meter?.label" size="lg" />

              <p v-if="locked && anyPosts" :class="styles.leftover">
                Last reading from when this title was tracked. It isn’t being updated.
              </p>

              <div v-if="meter && !(locked && !anyPosts)" :class="styles.meterFacts">
                <span :class="styles.fact"><strong>{{ formatNumber(meter.totalPosts) }}</strong> {{ meter.totalPosts === 1 ? "post" : "posts" }} counted</span>
                <span v-if="meter.filteredPosts" :class="styles.fact" title="Set aside by the trust filter: new accounts, duplicates, pile-ons">
                  <strong>{{ formatNumber(meter.filteredPosts) }}</strong> filtered
                </span>
                <span :class="styles.fact"><strong :class="styles[`conf-${meter.confidenceLabel}`]">{{ meter.confidenceLabel }}</strong> confidence</span>
                <span v-if="momentumText" :class="[styles.fact, styles[`mom-${momentumText.dir}`]]">{{ momentumText.text }}</span>
              </div>
              <button
                v-if="!locked"
                type="button"
                class="btn"
                :class="styles.refresh"
                :disabled="refreshing || !social || refreshWaitMinutes > 0 || configuredSources.length === 0"
                @click="loadSocial(true, controller?.signal)"
              >
                <span :class="[styles.refreshIcon, refreshing && styles.spin]">↻</span>
                {{ refreshing ? "Reading the room…" : "Refresh from sources" }}
              </button>
              <span v-if="refreshHint" :class="styles.refreshHint">{{ refreshHint }}</span>
            </div>
          </aside>
        </header>

        <!-- Side-by-side ratings -->
        <section :class="styles.section">
          <div :class="styles.sectionHead">
            <h2 :class="styles.h2">Ratings, side by side</h2>
            <span :class="styles.sectionSub">Everything on a 0–100 scale so the fan pulse and the critics line up.</span>
          </div>
          <RatingsStrip :meter="meter" :ratings="ratings?.ratings ?? null" :critics-average="ratings?.criticsAverage ?? null" />
        </section>

        <!-- Social pulse -->
        <section :class="styles.section">
          <div :class="styles.sectionHead">
            <h2 :class="styles.h2">The social pulse</h2>
            <span :class="styles.sectionSub">What people are actually saying, weighted by how much the crowd agreed with them.</span>
          </div>

          <div v-if="locked && !anyPosts" :class="styles.lockedPulse">
            <strong>No posts collected for this title.</strong>
            <span>It isn’t in the tracked set, so SocialMeter isn’t reading Reddit or X for it. Critic and audience ratings above are still live.</span>
          </div>

          <div v-else :class="styles.pulse">
            <div :class="styles.pulseSide">
              <div :class="styles.panel">
                <h3 :class="styles.h3">Sentiment mix</h3>
                <SentimentBar v-if="meter" :breakdown="meter.breakdown" />
                <div v-else :class="[styles.barSkeleton, 'skeleton']" />
              </div>

              <div v-if="meter?.platforms?.length" :class="styles.panel">
                <h3 :class="styles.h3">By platform</h3>
                <ul :class="styles.platforms">
                  <li v-for="p in meter.platforms" :key="p.platform" :class="styles.platform">
                    <span :class="styles.platformName">{{ p.platform === "x" ? "X" : "Reddit" }}</span>
                    <span :class="styles.platformPosts">{{ p.posts }} posts</span>
                    <span :class="styles.platformScore" :style="{ color: meterBand(p.score).color }">{{ p.score }}</span>
                  </li>
                </ul>
              </div>

              <div :class="styles.panel">
                <h3 :class="styles.h3">Sources</h3>
                <SourceStatus v-if="social?.sources" :sources="social.sources" />
                <div v-else :class="[styles.barSkeleton, 'skeleton']" />
                <p v-if="social && configuredSources.length === 0" :class="styles.hint">
                  No social source is connected yet. Add Reddit or X API credentials to the API’s user secrets and the meter starts pulling live posts.
                </p>
                <p :class="styles.hint">
                  Posts from brand-new accounts, repeat posts from one account and copy-pasted text don’t count.
                  <router-link :to="{ name: 'how-it-works' }" :class="styles.hintLink">How scoring works →</router-link>
                </p>
              </div>
            </div>

            <div :class="styles.feed">
              <div :class="styles.filters">
                <button
                  v-for="c in sentimentChips"
                  :key="c.value"
                  type="button"
                  :class="['chip', sentimentFilter === c.value && 'is-active']"
                  @click="setFilter('sentiment', c.value)"
                >
                  <span :class="styles.chipDot" :style="{ background: `var(--${c.value === 'positive' ? 'pos' : c.value === 'negative' ? 'neg' : 'neu'})` }" />
                  {{ c.label }}
                </button>
                <span :class="styles.filterSep" />
                <button type="button" :class="['chip', platformFilter === 'reddit' && 'is-active']" @click="setFilter('platform', 'reddit')">Reddit</button>
                <button type="button" :class="['chip', platformFilter === 'x' && 'is-active']" @click="setFilter('platform', 'x')">X</button>

                <button
                  type="button"
                  :class="[styles.shieldToggle, shield && styles.shieldOn]"
                  :aria-pressed="shield"
                  :title="shield ? 'Posts are hidden until you tap them' : 'Posts are shown in full'"
                  @click="toggleShield"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" />
                  </svg>
                  Spoiler shield {{ shield ? "on" : "off" }}
                </button>
              </div>

              <div v-if="feed.length" :class="styles.posts">
                <PostCard v-for="p in feed" :key="p.id" :post="p" :shielded="shield" />
              </div>

              <div v-else-if="feedLoading || !social" :class="styles.posts">
                <div v-for="i in 4" :key="i" :class="[styles.postSkeleton, 'skeleton']" />
              </div>

              <div v-else :class="styles.empty">
                <div :class="styles.emptyBolt">⚡</div>
                <strong v-if="anyPosts">Nothing matches that filter.</strong>
                <strong v-else>No posts measured yet.</strong>
                <span v-if="!anyPosts">
                  {{ configuredSources.length ? "The sources didn’t return anything for this title. Try a refresh in a bit." : "Connect Reddit or X in the API settings and hit refresh." }}
                </span>
              </div>

              <div v-if="feedPage < feedTotalPages" :class="styles.loadMore">
                <button type="button" class="btn" :disabled="feedLoading" @click="loadFeed(feedPage + 1, controller?.signal)">
                  {{ feedLoading ? "Loading…" : "Load more posts" }}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>
