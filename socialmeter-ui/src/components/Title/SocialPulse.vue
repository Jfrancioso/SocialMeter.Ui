<script setup>
import { computed } from "vue";
import { PLATFORM_NAMES } from "../../utils/platforms";
import { meterBand } from "../../utils/meter";
import SentimentBar from "../Meter/SentimentBar.vue";
import PostCard from "../Social/PostCard.vue";
import styles from "./SocialPulse.module.css";

// The posts behind the number: sentiment mix and per-platform readings on the side, the filterable feed in the middle.
const props = defineProps({
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
  /** "top" (most liked), "newest" or "oldest". */
  sortOrder: { type: String, default: "top" },
  shielded: { type: Boolean, default: true },
  /** The sources have never been read for this title. */
  neverRead: { type: Boolean, default: false },
  /** Set when a read was due but a limit on live reads turned it away: says for how long. Empty otherwise. */
  pauseNote: { type: String, default: "" }
});

// With nothing counted there is nothing to chart or filter: one clear message instead of empty bars and chips.
const emptyTitle = computed(() => (props.neverRead ? "Not read yet" : "No posts measured yet"));
const emptyText = computed(() => {
  if (props.neverRead && props.pauseNote) return `We haven’t read posts for this title yet. ${props.pauseNote}`;
  if (props.neverRead) return "We haven’t read posts for this title yet.";
  const filtered = props.meter?.filteredPosts ?? 0;
  if (filtered > 0)
    return `We found ${filtered} ${filtered === 1 ? "post" : "posts"}, but none passed our filters yet: not about this title, duplicates, or brand-new accounts.`;
  return "Nobody has posted about this title in a way we can measure yet. Check back soon.";
});

defineEmits(["filter", "sort", "load-more", "toggle-shield"]);

const sortOptions = [
  { value: "top", label: "Most liked" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" }
];

const sentimentChips = [
  { value: "positive", label: "Positive", color: "var(--loved)" },
  { value: "neutral", label: "Neutral", color: "var(--mixed)" },
  { value: "negative", label: "Negative", color: "var(--hated)" }
];

const platformName = { ...PLATFORM_NAMES, steam: "Steam reviews" };

// One filter per source that is actually connected, so a platform with nothing behind it never shows a button.
// Steam reviews only exist for games.
const chipLabel = PLATFORM_NAMES;
const platformChips = computed(() =>
  props.configuredSources
    .map((s) => s.platform)
    .filter((p) => chipLabel[p] && (p !== "steam" || props.type === "game"))
    .map((p) => ({ value: p, label: chipLabel[p] }))
);
</script>

<template>
  <div v-if="locked && !anyPosts" :class="styles.lockedPulse">
    <strong>No posts collected for this title.</strong>
    <span>It isn’t in the tracked set, so Chatterbub isn’t reading posts about it. Critic and audience ratings above are still live.</span>
  </div>

  <div v-else-if="social && meter && !anyPosts" :class="styles.lockedPulse">
    <strong>{{ emptyTitle }}</strong>
    <span>{{ emptyText }}</span>
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
      <!-- Three groups that wrap as a whole, never chip by chip: moods, platforms, then sort and the shield.
           On a phone each group gets its own row (see the CSS). -->
      <div :class="styles.filters">
        <div :class="styles.group">
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
        </div>
        <div v-if="platformChips.length" :class="[styles.group, styles.platformGroup]">
          <button
            v-for="p in platformChips"
            :key="p.value"
            type="button"
            :class="['chip', platformFilter === p.value && 'is-active']"
            @click="$emit('filter', 'platform', p.value)"
          >
            {{ p.label }}
          </button>
        </div>

        <div :class="styles.controls">
          <label :class="styles.sort">
            <span>Sort</span>
            <select :class="styles.sortSelect" :value="sortOrder" @change="$emit('sort', $event.target.value)">
              <option v-for="o in sortOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </label>

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
