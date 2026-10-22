<script setup>
import { meterBand } from "../../utils/meter";
import SentimentBar from "../Meter/SentimentBar.vue";
import PostCard from "../Social/PostCard.vue";
import styles from "./SocialPulse.module.css";

// The posts behind the number: sentiment mix and per-platform readings on the side, the filterable feed in the middle.
defineProps({
  type: { type: String, required: true },
  social: { type: Object, default: null },
  meter: { type: Object, default: null },
  locked: { type: Boolean, default: false },
  anyPosts: { type: Boolean, default: false },
  configuredSources: { type: Array, default: () => [] },
  feed: { type: Array, default: () => [] },
  feedPage: { type: Number, default: 1 },
  feedTotalPages: { type: Number, default: 0 },
  feedLoading: { type: Boolean, default: false },
  sentimentFilter: { type: String, default: "" },
  platformFilter: { type: String, default: "" },
  shielded: { type: Boolean, default: true }
});

defineEmits(["filter", "load-more", "toggle-shield"]);

const sentimentChips = [
  { value: "positive", label: "Positive", color: "var(--pos)" },
  { value: "neutral", label: "Neutral", color: "var(--neu)" },
  { value: "negative", label: "Negative", color: "var(--neg)" }
];

const platformName = { x: "X", reddit: "Reddit", steam: "Steam reviews" };
</script>

<template>
  <div v-if="locked && !anyPosts" :class="styles.lockedPulse">
    <strong>No posts collected for this title.</strong>
    <span>It isn’t in the tracked set, so Chatterbub isn’t reading Reddit or X for it. Critic and audience ratings above are still live.</span>
  </div>

  <div v-else :class="styles.pulse">
    <div :class="styles.side">
      <div :class="styles.panel">
        <h3 :class="styles.h3">Sentiment mix</h3>
        <SentimentBar v-if="meter" :breakdown="meter.breakdown" />
        <div v-else :class="[styles.barSkeleton, 'skeleton']" />
      </div>

      <div v-if="meter?.platforms?.length" :class="styles.panel">
        <h3 :class="styles.h3">By platform</h3>
        <ul :class="styles.platforms">
          <li v-for="p in meter.platforms" :key="p.platform" :class="styles.platform">
            <span :class="styles.platformName">{{ platformName[p.platform] ?? p.platform }}</span>
            <span :class="styles.platformPosts">{{ p.posts }} posts</span>
            <span :class="styles.platformScore" :style="{ color: meterBand(p.score).color }">{{ p.score }}</span>
          </li>
        </ul>
      </div>
    </div>

    <div :class="styles.feed">
      <div :class="styles.filters">
        <button
          v-for="c in sentimentChips"
          :key="c.value"
          type="button"
          :class="['chip', sentimentFilter === c.value && 'is-active']"
          @click="$emit('filter', 'sentiment', c.value)"
        >
          <span :class="styles.chipDot" :style="{ background: c.color }" />
          {{ c.label }}
        </button>
        <span :class="styles.filterSep" />
        <button type="button" :class="['chip', platformFilter === 'reddit' && 'is-active']" @click="$emit('filter', 'platform', 'reddit')">Reddit</button>
        <button type="button" :class="['chip', platformFilter === 'x' && 'is-active']" @click="$emit('filter', 'platform', 'x')">X</button>
        <button v-if="type === 'game'" type="button" :class="['chip', platformFilter === 'steam' && 'is-active']" @click="$emit('filter', 'platform', 'steam')">Steam</button>

        <button
          type="button"
          :class="[styles.shieldToggle, shielded && styles.shieldOn]"
          :aria-pressed="shielded"
          :title="shielded ? 'Posts are hidden until you tap them' : 'Posts are shown in full'"
          @click="$emit('toggle-shield')"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" />
          </svg>
          Spoiler shield {{ shielded ? "on" : "off" }}
        </button>
      </div>

      <div v-if="feed.length" :class="styles.posts">
        <PostCard v-for="p in feed" :key="p.id" :post="p" :shielded="shielded" />
      </div>

      <div v-else-if="feedLoading || !social" :class="styles.posts">
        <div v-for="i in 4" :key="i" :class="[styles.postSkeleton, 'skeleton']" />
      </div>

      <div v-else :class="styles.empty">
        <div :class="styles.emptyBolt">⚡</div>
        <strong v-if="anyPosts">Nothing matches that filter.</strong>
        <strong v-else>No posts measured yet.</strong>
        <span v-if="!anyPosts">
          Nobody has posted about this title in a way we can measure yet. Check back soon.
        </span>
      </div>

      <div v-if="feedPage < feedTotalPages" :class="styles.loadMore">
        <button type="button" class="btn" :disabled="feedLoading" @click="$emit('load-more')">
          {{ feedLoading ? "Loading…" : "Load more posts" }}
        </button>
      </div>
    </div>
  </div>
</template>
