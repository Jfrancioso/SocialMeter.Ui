<script setup>
import { authorHandle, platformName } from "../../utils/platforms";
import { computed, inject, nextTick, ref, watch } from "vue";
import { formatCompact, timeAgo } from "../../utils/format";
import { hidePost, restorePost } from "../../api";
import { useAdmin } from "../../composables/useAdmin";
import { MODERATION_REASONS, reasonLabel } from "../../utils/moderation";
import OutboundLink from "../OutboundLink.vue";
import PlatformIcon from "./PlatformIcon.vue";
import styles from "./PostCard.module.css";

const props = defineProps({
  post: { type: Object, required: true },
  /** When true the body is blurred behind a "potential spoiler" cover until the reader taps it. */
  shielded: { type: Boolean, default: true }
});

// ---- Operator removal: a signed-in admin with the admin bar's "Remove buttons" switch on, on a page that provides the
// moderation context (the title page). Picking Remove turns the whole card into a confirm step; nothing happens until a
// reason is chosen. ----
const { admin } = useAdmin();
const moderation = inject("moderation", null);
const canModerate = computed(() => !!admin.actor && admin.moderating && !!moderation);
const confirmPanel = ref(null);

async function startRemove() {
  picking.value = true;
  modError.value = null;
  await nextTick();
  confirmPanel.value?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  confirmPanel.value?.focus({ preventScroll: true });
}

// Switching Remove buttons off mid-way closes an open confirm step.
watch(canModerate, (on) => { if (!on) picking.value = false; });
const reasons = MODERATION_REASONS;
const picking = ref(false);
const working = ref(false);
const modError = ref(null);
const removed = ref(null); // { reason, score, label } once removed here

async function remove(reason) {
  working.value = true;
  modError.value = null;
  try {
    const result = await hidePost(props.post.id, reason, moderation.titleName.value);
    removed.value = { reason: reasonLabel(reason), score: result.score, label: result.label };
    picking.value = false;
    moderation.onModerated(result);
  } catch (e) {
    modError.value = e?.message ?? String(e);
  } finally {
    working.value = false;
  }
}

async function undo() {
  working.value = true;
  modError.value = null;
  try {
    const result = await restorePost(props.post.id);
    removed.value = null;
    moderation.onModerated(result);
  } catch (e) {
    modError.value = e?.message ?? String(e);
  } finally {
    working.value = false;
  }
}

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

const handle = computed(() => authorHandle(props.post.platform, props.post.author));
const where = computed(() => {
  if (props.post.platform === "reddit" && props.post.community) return `r/${props.post.community}`;
  if (props.post.platform === "x" || props.post.platform === "bluesky") return platformName(props.post.platform);
  if (props.post.platform === "steam") return props.post.playtimeHours != null ? `Steam · ${props.post.playtimeHours} h played` : "Steam";
  return "";
});

const sentimentLabel = { positive: "Positive", neutral: "Neutral", negative: "Negative" };
const readAs = computed(() => {
  const s = props.post.sentimentScore;
  return `Read as ${(sentimentLabel[props.post.sentiment] ?? props.post.sentiment).toLowerCase()} (${s > 0 ? "+" : ""}${s})`;
});

// "Why this score" chips: how much of the author's experience is in the post, and whether the trust policy discounted them.
const substanceLabel = { bare: "Bare reaction", some: "Some detail", detailed: "Specific" };
const substanceHint = {
  bare: "A verdict with nothing behind it: “10/10”, “trash”, “peak”. Counts, but at half the weight of a detailed take.",
  some: "An opinion with one general reason: “great visuals”, “too long”.",
  detailed: "Names scenes, characters, mechanics, or makes an argument. Full substance weight."
};
const share = computed(() => {
  const w = props.post.weightShare;
  if (w == null) return null;
  return w < 0.1 ? "<0.1%" : `${w}%`;
});
</script>

<template>
  <article v-if="removed" :class="[styles.card, styles.removed]" role="status">
    <div :class="styles.removedText">
      <strong :class="styles.removedTitle">Post removed · {{ removed.reason }}</strong>
      <span>
        Gone from the feed and the score.
        <template v-if="removed.score != null">Score now {{ removed.score }} · {{ removed.label }}.</template>
      </span>
    </div>
    <button type="button" :class="styles.undoButton" :disabled="working" @click="undo">{{ working ? "Undoing…" : "Undo" }}</button>
    <p v-if="modError" :class="styles.modError">{{ modError }}</p>
  </article>
  <article v-else :class="[styles.card, styles[`s-${post.sentiment}`], canModerate && picking && styles.confirming]">
    <div
      v-if="canModerate && picking"
      ref="confirmPanel"
      :class="styles.confirm"
      role="group"
      aria-label="Remove this post"
      tabindex="-1"
      @keydown.esc="picking = false"
    >
      <p :class="styles.confirmTitle">Remove this post from Chatterbub?</p>
      <p :class="styles.confirmHint">Pick a reason. It leaves the feed and the score right away, and you can undo it.</p>
      <div :class="styles.confirmReasons">
        <button v-for="r in reasons" :key="r.value" type="button" :class="styles.reasonButton" :disabled="working" @click="remove(r.value)">
          {{ r.label }}
        </button>
      </div>
      <div :class="styles.confirmFoot">
        <span v-if="working" :class="styles.confirmHint">Removing…</span>
        <button type="button" :class="styles.cancelButton" :disabled="working" @click="picking = false">Cancel, keep it</button>
      </div>
      <p v-if="modError" :class="styles.modError">{{ modError }}</p>
    </div>
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
      <span v-if="post.verdictUp != null" :class="[styles.pill, post.verdictUp ? styles['pill-positive'] : styles['pill-negative']]" :title="readAs">
        {{ post.verdictUp ? "👍 Recommended" : "👎 Not recommended" }}
      </span>
      <span v-else :class="[styles.pill, styles[`pill-${post.sentiment}`]]" :title="readAs">
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
          <span :class="styles.sensitiveHint">Flagged by {{ platformName(post.platform) }} · tap to show</span>
        </button>
        <OutboundLink
          v-for="(m, i) in media.slice(0, 4)"
          v-else
          :key="i"
          :href="post.sourceUrl ?? m.url"
          kind="post"
          :class="styles.mediaItem"
          :title="m.alt || (m.type === 'video' ? 'Video' : 'Image')"
        >
          <img :src="m.url" :alt="m.alt || ''" loading="lazy" :class="styles.mediaImg" />
          <span v-if="m.type !== 'photo'" :class="styles.mediaBadge">{{ m.type === "video" ? "▶ video" : "GIF" }}</span>
        </OutboundLink>
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
      <span :class="styles.chips">
        <span v-if="post.substanceLevel" :class="[styles.chip, post.substanceLevel === 'detailed' && styles.chipStrong]" :title="substanceHint[post.substanceLevel]">
          {{ substanceLabel[post.substanceLevel] ?? post.substanceLevel }}
        </span>
        <span v-if="post.trustLevel === 'reduced'" :class="[styles.chip, styles.chipMuted]" title="The trust policy discounted this author (young account, little history, or little playtime)">reduced weight</span>
        <span v-if="share" :class="styles.chip" title="This post's share of everything that went into the score">{{ share }} of score</span>
      </span>
      <button v-if="shielded && revealed" type="button" :class="styles.hide" @click="revealed = false">Hide</button>
      <OutboundLink v-if="post.sourceUrl" :href="post.sourceUrl" kind="post" :class="styles.link">{{ post.platform === "steam" ? "Open review" : "Open post" }} ↗</OutboundLink>
      <button v-if="canModerate && !picking" type="button" :class="styles.modButton" title="Admin: remove this post from the feed and the score" @click="startRemove">
        Remove
      </button>
    </footer>
  </article>
</template>
