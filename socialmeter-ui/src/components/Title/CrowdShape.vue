<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { getSocialPost } from "../../api";
import { meterBand } from "../../utils/meter";
import { platformName } from "../../utils/platforms";
import { layoutCrowd, scoreX } from "../../utils/crowdLayout";
import PostCard from "../Social/PostCard.vue";
import styles from "./CrowdShape.module.css";

// "The crowd" (the Crowd Shape pilot: only titles listed in the API's CrowdShape:Titles get one). Every counted post is a
// dot, placed from "hated it" to "loved it" and sized by its weight in the score, with the shape of the whole named on top.
// Clicking a dot loads that post into the panel underneath, in the same card (and behind the same spoiler shield) as the feed.
const props = defineProps({
  type: { type: String, required: true },
  id: { type: Number, required: true },
  crowd: { type: Object, required: true },
  meter: { type: Object, default: null },
  shielded: { type: Boolean, default: true }
});

// Keys match CrowdShapeRules on the API.
const SHAPES = {
  split: { label: "Split", tone: "split" },
  loved: { label: "Loved", tone: "pos" },
  panned: { label: "Panned", tone: "neg" },
  mixed: { label: "Mixed", tone: "mid" },
  "leaning-positive": { label: "Leaning positive", tone: "pos" },
  "leaning-negative": { label: "Leaning negative", tone: "neg" },
  early: { label: "Early read", tone: "mid" }
};
const shape = computed(() => SHAPES[props.crowd.shape] ?? SHAPES.early);

const pct = (n) => Math.round(n ?? 0);
const summary = computed(() => {
  const c = props.crowd;
  if (c.shape === "early") return `Only ${c.posts} posts so far: too few to call the shape.`;
  const sides = `${pct(c.positive)}% loved it · ${pct(c.negative)}% hated it`;
  return c.shape === "split" || c.shape === "mixed" ? `${sides} · ${pct(c.neutral)}% in between` : sides;
});
const caption = computed(() => {
  const c = props.crowd;
  const shown = c.dots.length < c.posts ? ` Showing the ${c.dots.length} that weigh most.` : "";
  return `Each dot is one of the ${c.posts} posts we counted, marked with where it was posted. Bigger dots carry more weight in the score.${shown}`;
});

// ---- layout: measured width, fixed height per breakpoint ----
// The layout is redone when the width settles (not on every pixel of a window drag): a big title is ~100 ms of work.
const PAD = 16;
const strip = ref(null);
const width = ref(0);
let observer = null;
let resizeTimer = null;
onMounted(() => {
  width.value = strip.value?.clientWidth ?? 0;
  if (typeof ResizeObserver !== "undefined" && strip.value) {
    observer = new ResizeObserver(([entry]) => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => (width.value = Math.round(entry.contentRect.width)), 150);
    });
    observer.observe(strip.value);
  }
});
onBeforeUnmount(() => {
  observer?.disconnect();
  clearTimeout(resizeTimer);
  postController?.abort();
});

const narrow = computed(() => width.value > 0 && width.value < 560);
const height = computed(() => (narrow.value ? 180 : 230));

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const dots = computed(() => {
  if (!width.value) return [];
  const placed = layoutCrowd(props.crowd.dots, { width: width.value, height: height.value, pad: PAD, rMin: 6, rMax: narrow.value ? 13 : 18 });
  return placed.map((p, i) => {
    const d = props.crowd.dots[i];
    return {
      ...d,
      ...p,
      color: meterBand((d.value + 1) * 50).color,
      label: `${cap(d.sentiment)} post on ${platformName(d.platform)}, ${d.share}% of the score`
    };
  });
});

const markerX = computed(() => (props.meter?.score != null && width.value ? scoreX(props.meter.score, width.value, PAD) : null));
const markerFlip = computed(() => markerX.value != null && markerX.value > width.value - 110);

// ---- the picked post ----
const selected = ref(null);
const post = ref(null);
const postFailed = ref(false);
let postController = null;

async function pick(dot) {
  if (selected.value === dot.id) return close();
  selected.value = dot.id;
  post.value = null;
  postFailed.value = false;
  postController?.abort();
  postController = new AbortController();
  try {
    post.value = await getSocialPost(props.type, props.id, dot.id, { signal: postController.signal });
  } catch (e) {
    if (e?.name !== "AbortError") postFailed.value = true;
  }
}

function close() {
  postController?.abort();
  selected.value = null;
  post.value = null;
  postFailed.value = false;
}

// A new reading (Refresh) redraws the dots; an open post would point at a dot that may have moved.
watch(() => props.crowd, close);

const caretX = computed(() => {
  const d = dots.value.find((x) => x.id === selected.value);
  return d ? Math.min(Math.max(d.x, 18), width.value - 18) : null;
});
</script>

<template>
  <div :class="styles.crowd">
    <div :class="styles.head">
      <span :class="[styles.pill, styles[`pill-${shape.tone}`]]">{{ shape.label }}</span>
      <p :class="styles.summary">{{ summary }}</p>
    </div>

    <div ref="strip" :class="styles.strip">
      <div :class="styles.field" :style="{ height: `${height}px` }">
        <template v-if="markerX != null">
          <span :class="styles.marker" :style="{ left: `${markerX}px` }" aria-hidden="true" />
          <span :class="[styles.markerLabel, markerFlip && styles.markerLabelFlip]" :style="{ left: `${markerX}px` }" aria-hidden="true">
            Score {{ meter.score }}
          </span>
        </template>
        <button
          v-for="d in dots"
          :key="d.id"
          type="button"
          :class="[styles.dot, selected === d.id && styles.dotOn, selected != null && selected !== d.id && styles.dotDim]"
          :style="{ left: `${d.x - d.r}px`, top: `${d.y - d.r}px`, width: `${2 * d.r}px`, height: `${2 * d.r}px`, background: d.color }"
          :aria-label="d.label"
          :aria-pressed="selected === d.id"
          @click="pick(d)"
        >
          <svg v-if="d.platform === 'x'" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" :class="styles.glyph">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <svg v-else-if="d.platform === 'bluesky'" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" :class="[styles.glyph, styles.glyphWide]">
            <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8Z" />
          </svg>
          <svg v-else-if="d.platform === 'steam'" viewBox="0 0 24 24" aria-hidden="true" :class="styles.glyph">
            <circle cx="15.5" cy="8.5" r="4.2" fill="none" stroke="currentColor" stroke-width="2.6" />
            <circle cx="7.5" cy="16.5" r="3.6" fill="currentColor" />
            <path d="M10 14.5l3-3.2" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" />
          </svg>
        </button>
      </div>
      <div :class="styles.scale" aria-hidden="true">
        <span style="flex: 35; background: var(--meter-cold)" />
        <span style="flex: 15; background: var(--meter-lukewarm)" />
        <span style="flex: 15; background: var(--meter-warm)" />
        <span style="flex: 15; background: var(--meter-hot)" />
        <span style="flex: 20; background: var(--meter-electric)" />
      </div>
      <div :class="styles.ends">
        <span>Hated it</span>
        <span>Mixed</span>
        <span>Loved it</span>
      </div>
    </div>

    <p :class="styles.caption">{{ caption }}</p>

    <div v-if="selected != null" :class="styles.panel" role="region" aria-live="polite" aria-label="The post you picked">
      <span v-if="caretX != null" :class="styles.caret" :style="{ left: `${caretX}px` }" aria-hidden="true" />
      <PostCard v-if="post" :key="post.id" :post="post" :shielded="shielded" />
      <p v-else-if="postFailed" :class="styles.note">Couldn’t load this post. It may have been removed since the page loaded.</p>
      <p v-else :class="styles.note">Loading the post…</p>
      <button type="button" :class="styles.close" @click="close">Close</button>
    </div>
  </div>
</template>
