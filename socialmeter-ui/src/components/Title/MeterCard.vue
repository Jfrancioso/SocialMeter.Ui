<script setup>
import { ref } from "vue";
import { formatNumber, timeAgo } from "../../utils/format";
import MeterGauge from "../Meter/MeterGauge.vue";
import ShareDialog from "./ShareDialog.vue";
import styles from "./MeterCard.module.css";

// The hero's reading card: gauge, the facts under it, the live-refresh button with its cost and cool-down hints, and the share card.
defineProps({
  title: { type: Object, default: null },
  ratings: { type: Object, default: null },
  social: { type: Object, default: null },
  meter: { type: Object, default: null },
  locked: { type: Boolean, default: false },
  anyPosts: { type: Boolean, default: false },
  slowLoad: { type: Boolean, default: false },
  refreshing: { type: Boolean, default: false },
  refreshWaitMinutes: { type: Number, default: 0 },
  configuredSources: { type: Array, default: () => [] },
  refreshHint: { type: String, default: "" },
  trendFact: { type: Object, default: null },
  /** The sources have never been read for this title. */
  neverRead: { type: Boolean, default: false },
  /** Set when a read was due but a limit on live reads turned it away: says for how long. Empty otherwise. */
  pauseNote: { type: String, default: "" }
});

defineEmits(["refresh"]);

const shareOpen = ref(false);
</script>

<template>
  <div :class="styles.card">
    <div :class="styles.head">
      <span :class="styles.title">Chatterbub score</span>
      <span v-if="social?.lastRefreshedAt && !(locked && !anyPosts)" :class="styles.when">updated {{ timeAgo(social.lastRefreshedAt) }}</span>
    </div>

    <template v-if="!social">
      <div :class="[styles.gaugeSkeleton, 'skeleton']" />
      <p v-if="slowLoad" :class="styles.slowHint">Reading the room: pulling fresh posts and reading each one. First looks take about half a minute.</p>
    </template>

    <template v-else-if="neverRead && !locked">
      <div :class="styles.lockedPanel">
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
        <strong>Not read yet</strong>
        <span v-if="pauseNote">We haven’t read posts for this title yet. {{ pauseNote }}</span>
        <span v-else>We haven’t read posts for this title yet. Press Refresh to take a first look.</span>
      </div>
    </template>

    <template v-else-if="locked && !anyPosts">
      <div :class="styles.lockedPanel">
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
        <strong>Not tracked right now</strong>
        <span>Chatterbub measures what people are talking about today: titles in theaters, on the air, trending, this season’s picks, and anything that’s gone electric. This one isn’t on that list at the moment, so there’s no reading.</span>
        <router-link :to="{ name: 'how-it-works' }" :class="styles.lockedLink">How tracking works →</router-link>
      </div>
    </template>

    <MeterGauge v-else :score="meter?.score" :total-posts="meter?.totalPosts ?? 0" :label="meter?.label" :margin="meter?.stats?.margin ?? null" size="lg" />

    <p v-if="locked && anyPosts" :class="styles.leftover">Last reading from when this title was tracked. It isn’t being updated.</p>
    <p v-else-if="pauseNote && !neverRead" :class="styles.leftover">Showing the last reading. {{ pauseNote }}</p>

    <div v-if="meter && !neverRead && !(locked && !anyPosts)" :class="styles.facts">
      <span :class="styles.fact"><strong>{{ formatNumber(meter.totalPosts) }}</strong> {{ meter.totalPosts === 1 ? "post" : "posts" }} counted</span>
      <span v-if="meter.filteredPosts" :class="styles.fact" title="Set aside by the trust filter: new accounts, duplicates, pile-ons">
        <strong>{{ formatNumber(meter.filteredPosts) }}</strong> filtered
      </span>
      <span v-if="meter.stats && anyPosts" :class="styles.fact" title="Kish effective sample size × average trust-and-substance credit">
        <strong>{{ meter.stats.effectivePosts }}</strong> effective
      </span>
      <span :class="styles.fact"><strong :class="styles[`conf-${meter.confidenceLabel}`]">{{ meter.confidenceLabel }}</strong> confidence</span>
      <span v-if="trendFact && anyPosts" :class="[styles.fact, styles[`trend-${trendFact.dir}`]]">{{ trendFact.text }}</span>
    </div>

    <button
      v-if="!locked"
      type="button"
      class="btn"
      :class="styles.refresh"
      :disabled="refreshing || !social || refreshWaitMinutes > 0 || configuredSources.length === 0"
      @click="$emit('refresh')"
    >
      <span :class="[styles.refreshIcon, refreshing && styles.spin]">↻</span>
      {{ refreshing ? "Reading the room…" : "Refresh from sources" }}
    </button>
    <span v-if="refreshHint" :class="styles.refreshHint">{{ refreshHint }}</span>

    <button v-if="anyPosts && title && meter" type="button" :class="styles.share" @click="shareOpen = true">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" /><path d="M12 15V3m0 0-4 4m4-4 4 4" /></svg>
      Share this reading
    </button>
    <ShareDialog v-if="title && meter" :open="shareOpen" :title="title" :meter="meter" :ratings="ratings" @close="shareOpen = false" />
  </div>
</template>
