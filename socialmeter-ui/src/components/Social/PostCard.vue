<script setup>
import { computed, ref, watch } from "vue";
import { formatCompact, timeAgo } from "../../utils/format";
import PlatformIcon from "./PlatformIcon.vue";
import styles from "./PostCard.module.css";

const props = defineProps({
  post: { type: Object, required: true },
  /** When true the body is blurred behind a "potential spoiler" cover until the reader taps it. */
  shielded: { type: Boolean, default: true }
});

const expanded = ref(false);
const revealed = ref(false);

// Sensitive media (flagged by the platform) stays hidden until the reader asks, even with the shield off.
const showSensitive = ref(false);
const media = computed(() => props.post.media ?? []);
const mediaHidden = computed(() => props.post.sensitive && !showSensitive.value);

// Turning the shield back on re-covers every post.
watch(() => props.shielded, (on) => { if (on) revealed.value = false; });

const covered = computed(() => props.shielded && !revealed.value);
const long = computed(() => props.post.content.length > 280);
const text = computed(() => (long.value && !expanded.value ? `${props.post.content.slice(0, 280).trimEnd()}…` : props.post.content));

const handle = computed(() => {
  if (props.post.platform === "x") return `@${props.post.author}`;
  if (props.post.platform === "steam") return props.post.author;
  return `u/${props.post.author}`;
});
const where = computed(() => {
  if (props.post.platform === "reddit" && props.post.community) return `r/${props.post.community}`;
  if (props.post.platform === "x") return "X";
  if (props.post.platform === "steam") return props.post.playtimeHours != null ? `Steam · ${props.post.playtimeHours} h played` : "Steam";
  return "";
});

const sentimentLabel = { positive: "Positive", neutral: "Neutral", negative: "Negative" };
</script>

<template>
  <article :class="[styles.card, styles[`s-${post.sentiment}`]]">
    <header :class="styles.head">
      <PlatformIcon :platform="post.platform" :size="22" />
      <div :class="styles.who">
        <span :class="styles.author">{{ handle }}</span>
        <span :class="styles.where">
          <template v-if="where">{{ where }} · </template>{{ timeAgo(post.createdAt) }}
          <span v-if="post.established" :class="styles.established" title="Long-standing account — counts at full weight">
            <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5L20 7" /></svg>
            established
          </span>
        </span>
      </div>
      <span v-if="post.verdictUp != null" :class="[styles.pill, post.verdictUp ? styles['pill-positive'] : styles['pill-negative']]" :title="`Sentiment score ${post.sentimentScore}`">
        {{ post.verdictUp ? "👍 Recommended" : "👎 Not recommended" }}
      </span>
      <span v-else :class="[styles.pill, styles[`pill-${post.sentiment}`]]" :title="`Sentiment score ${post.sentimentScore}`">
        {{ sentimentLabel[post.sentiment] ?? post.sentiment }}
      </span>
    </header>

    <div :class="[styles.bodyWrap, covered && styles.covered]">
      <p :class="styles.body" :aria-hidden="covered">{{ text }}</p>
      <button v-if="long && !covered" type="button" :class="styles.more" @click="expanded = !expanded">
        {{ expanded ? "Show less" : "Read more" }}
      </button>

      <div v-if="media.length" :class="[styles.media, media.length > 1 && styles.mediaGrid]" :aria-hidden="covered">
        <button v-if="mediaHidden" type="button" :class="styles.sensitive" @click="showSensitive = true">
          <span :class="styles.sensitiveTitle">Sensitive media</span>
          <span :class="styles.sensitiveHint">Flagged by {{ post.platform === "x" ? "X" : "Reddit" }} · tap to show</span>
        </button>
        <a
          v-for="(m, i) in media.slice(0, 4)"
          v-else
          :key="i"
          :href="post.sourceUrl ?? m.url"
          target="_blank"
          rel="noopener"
          :class="styles.mediaItem"
          :title="m.alt || (m.type === 'video' ? 'Video' : 'Image')"
        >
          <img :src="m.url" :alt="m.alt || ''" loading="lazy" :class="styles.mediaImg" />
          <span v-if="m.type !== 'photo'" :class="styles.mediaBadge">{{ m.type === "video" ? "▶ video" : "GIF" }}</span>
        </a>
      </div>

      <button v-if="covered" type="button" :class="styles.cover" @click="revealed = true">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M3 3l18 18" /><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 5.1A10.9 10.9 0 0 1 12 5c5 0 9 4 10 7a11.6 11.6 0 0 1-2.2 3.3" /><path d="M6.6 6.6C4.3 8 2.7 10 2 12c1 3 5 7 10 7a10 10 0 0 0 3.4-.6" />
        </svg>
        <span :class="styles.coverTitle">Potential spoiler</span>
        <span :class="styles.coverHint">Tap to reveal this post</span>
      </button>
    </div>

    <footer :class="styles.foot">
      <span :class="styles.stat" :title="post.platform === 'x' ? 'Likes' : post.platform === 'steam' ? 'Found helpful' : 'Upvotes'">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 4 7 8h-4v8H9v-8H5z" /></svg>
        {{ formatCompact(post.upvotes) }}
      </span>
      <span :class="styles.stat" title="Comments">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1.1-3.7A8 8 0 1 1 20 12Z" /></svg>
        {{ formatCompact(post.comments) }}
      </span>
      <button v-if="shielded && revealed" type="button" :class="styles.hide" @click="revealed = false">Hide</button>
      <a v-if="post.sourceUrl" :href="post.sourceUrl" target="_blank" rel="noopener" :class="styles.link">{{ post.platform === "steam" ? "Open review" : "Open post" }} ↗</a>
    </footer>
  </article>
</template>
