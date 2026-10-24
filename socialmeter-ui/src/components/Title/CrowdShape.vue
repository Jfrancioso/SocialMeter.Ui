<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { getSocialPost } from "../../api";
import { meterBand } from "../../utils/meter";
import { platformName } from "../../utils/platforms";
import { layoutZones, pickDots, scoreX } from "../../utils/crowdLayout";
import { useInView } from "../../composables/useInView";
import PostCard from "../Social/PostCard.vue";
import styles from "./CrowdShape.module.css";

// "The crowd": every counted post is a dot, in one of three zones (Hated it | Mixed | Loved it) as wide as its share of
// the score, sized by its weight in the score, with the shape of the whole named on top and the score as a line across.
// The API decides which titles get one (CrowdShapeService: listed titles, live events and the most talked about).
// Clicking a dot opens that post, in the same card (and behind the same spoiler shield) as the feed: under the strip on a
// wide screen, in a sheet from the bottom of the screen on a phone so the dots and the post are both in view.
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

// The three zones' names and colours, by the post sentiment each holds (see ZONES in crowdLayout).
const ZONE_LOOK = {
  negative: { name: "Hated it", color: "var(--meter-cold)" },
  neutral: { name: "Mixed", color: "var(--meter-warm)" },
  positive: { name: "Loved it", color: "var(--meter-electric)" }
};

const pct = (n) => Math.round(n ?? 0);
const summary = computed(() => {
  const c = props.crowd;
  if (c.shape === "early") return `Only ${c.posts} posts so far: too few to call the shape.`;
  const sides = `${pct(c.positive)}% loved it · ${pct(c.negative)}% hated it`;
  return c.shape === "split" || c.shape === "mixed" ? `${sides} · ${pct(c.neutral)}% in between` : sides;
});
const caption = computed(() => {
  const c = props.crowd;
  const n = visible.value.length;
  const shown = n < c.posts ? ` Showing ${n}: the ones that count most on each side, as many as its share.` : "";
  return `Each dot is one of the ${c.posts} posts we counted, marked with where it was posted. Each side gets room by its share; bigger dots carry more weight in the score.${shown}`;
});

// ---- layout: measured width, fixed height per breakpoint ----
// The layout is redone when the width settles (not on every pixel of a window drag).
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
  window.addEventListener("keydown", onKey);
});
onBeforeUnmount(() => {
  observer?.disconnect();
  clearTimeout(resizeTimer);
  clearTimeout(enterTimer);
  postController?.abort();
  window.removeEventListener("keydown", onKey);
});

const narrow = computed(() => width.value > 0 && width.value < 560);
// The strip's usual height; a crowded zone grows it up to MAX_HEIGHT before its dots shrink (see crowdLayout).
const baseHeight = computed(() => (narrow.value ? 180 : 230));
const MAX_HEIGHT = 300;

// The API sends up to CrowdShape:MaxDots, heaviest first; a phone draws at most PHONE_MAX_DOTS, so dots stay big enough
// to read and tap. Either way each side gets dots in proportion to its share (pickDots).
const PHONE_MAX_DOTS = 100;
const shares = computed(() => ({ negative: props.crowd.negative, neutral: props.crowd.neutral, positive: props.crowd.positive }));
const visible = computed(() => (narrow.value ? pickDots(props.crowd.dots, PHONE_MAX_DOTS, shares.value) : props.crowd.dots));

// Entrance timing (the transition itself is in the CSS, 650 ms): each dot starts STAGGER_MS after the one before it.
const ENTER_MS = 650;
const STAGGER_MS = 10;
const MAX_STAGGER_MS = 450;

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const layout = computed(() =>
  width.value
    ? layoutZones(visible.value, {
        width: width.value,
        height: baseHeight.value,
        maxHeight: MAX_HEIGHT,
        // The zones are sized by every counted post, not just the ones drawn.
        shares: shares.value,
        rMin: 6,
        rMax: narrow.value ? 13 : 18
      })
    : { dots: [], height: baseHeight.value, zones: [] }
);
const height = computed(() => layout.value.height);
const dots = computed(() =>
  layout.value.dots.map((p, i) => {
    const d = visible.value[i];
    return {
      ...d,
      ...p,
      color: meterBand((d.value + 1) * 50).color,
      label: `${cap(d.sentiment)} post on ${platformName(d.platform)}, ${d.share}% of the score`,
      // Below 12 px across a platform mark is an unreadable speck; the dot alone reads better.
      glyph: p.r >= 6 ? d.platform : null,
      // Entrance: start just above the strip; the heaviest (first) land first, the whole crowd within MAX_STAGGER_MS.
      drop: -(p.y + p.r + 12),
      delay: Math.min(i * STAGGER_MS, MAX_STAGGER_MS)
    };
  })
);

// The zones under the strip: a coloured band each, and a label as long as there is room for it.
// A zone holding a post or two can round to 0%, which reads as a contradiction next to its dot: say "<1%" instead.
const zonePct = (share) => (share > 0 && share < 0.5 ? "<1%" : `${pct(share)}%`);
const zones = computed(() =>
  layout.value.zones
    .filter((z) => z.width > 0)
    .map((z) => ({
      ...z,
      ...ZONE_LOOK[z.key],
      text: z.width >= 96 ? `${ZONE_LOOK[z.key].name} · ${zonePct(z.share)}` : z.width >= 34 ? zonePct(z.share) : ""
    }))
);

// ---- entrance: the first time the strip scrolls into view, the dots drop into place ----
// The common "reveal on scroll" pattern: useInView says when, each dot's transition-delay sets the order, and the CSS
// transition does the motion. Plays once per page; reduced-motion visitors get the dots in place (the CSS agrees).
const field = ref(null);
const inView = useInView(field, { threshold: 0.3 });
const reduceMotion = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const phase = ref(reduceMotion ? "done" : "waiting");   // waiting -> entering -> done
let enterTimer = null;
watch(
  [inView, () => dots.value.length],
  ([seen, count]) => {
    if (phase.value !== "waiting" || !seen || !count) return;
    // This runs after the render, so the dots are on the page in their waiting position. Reading the layout makes the
    // browser apply that position before the class changes, giving the transition its starting point (the usual reflow
    // trick; unlike animation frames it also works in a background tab).
    void field.value?.offsetHeight;
    phase.value = "entering";
    enterTimer = setTimeout(() => (phase.value = "done"), ENTER_MS + MAX_STAGGER_MS);
  },
  { flush: "post" }
);

const markerX = computed(() => (props.meter?.score != null && width.value ? scoreX(props.meter.score, width.value) : null));
const markerFlip = computed(() => markerX.value != null && markerX.value > width.value - 110);

// ---- the picked post ----
const selected = ref(null);
const post = ref(null);
const postFailed = ref(false);
const sheet = ref(null);
let postController = null;

async function pick(dot, event) {
  if (selected.value === dot.id) return close();
  selected.value = dot.id;
  post.value = null;
  postFailed.value = false;
  postController?.abort();
  postController = new AbortController();
  const dotEl = event?.currentTarget;
  try {
    post.value = await getSocialPost(props.type, props.id, dot.id, { signal: postController.signal });
  } catch (e) {
    if (e?.name !== "AbortError") postFailed.value = true;
  }
  if (narrow.value) keepAboveSheet(dotEl);
}

// On a phone the sheet covers the bottom of the screen: if the tapped dot is now under it (or under the top bar),
// scroll just enough to bring it into the gap between the two.
async function keepAboveSheet(dotEl) {
  await nextTick();
  if (!dotEl || !sheet.value) return;
  const top = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 58;
  // Where the sheet comes to rest: offsetTop ignores the slide-in transform still running at this point.
  const bottom = sheet.value.offsetTop;
  const rect = dotEl.getBoundingClientRect();
  const centre = rect.top + rect.height / 2;
  if (centre < top + 12 || centre > bottom - 12) {
    window.scrollBy({ top: centre - (top + bottom) / 2, behavior: reduceMotion ? "auto" : "smooth" });
  }
}

function close() {
  postController?.abort();
  selected.value = null;
  post.value = null;
  postFailed.value = false;
}

function onKey(e) {
  if (e.key === "Escape" && selected.value != null) close();
}

// A swipe down on the sheet's top edge closes it, as phones' own sheets do.
let touchY = null;
const swipeStart = (e) => (touchY = e.touches[0].clientY);
function swipeEnd(e) {
  if (touchY != null && e.changedTouches[0].clientY - touchY > 50) close();
  touchY = null;
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
      <div ref="field" :class="[styles.field, styles[phase]]" :style="{ height: `${height}px` }">
        <span v-for="z in zones.slice(1)" :key="z.key" :class="styles.zoneLine" :style="{ left: `${z.x}px` }" aria-hidden="true" />
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
          :style="{
            left: `${d.x - d.r}px`, top: `${d.y - d.r}px`, width: `${2 * d.r}px`, height: `${2 * d.r}px`, background: d.color,
            '--drop': `${d.drop}px`, '--delay': `${d.delay}ms`
          }"
          :aria-label="d.label"
          :aria-pressed="selected === d.id"
          @click="pick(d, $event)"
        >
          <svg v-if="d.glyph === 'x'" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" :class="styles.glyph">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <svg v-else-if="d.glyph === 'bluesky'" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" :class="[styles.glyph, styles.glyphWide]">
            <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8Z" />
          </svg>
          <svg v-else-if="d.glyph === 'steam'" viewBox="0 0 24 24" aria-hidden="true" :class="styles.glyph">
            <circle cx="15.5" cy="8.5" r="4.2" fill="none" stroke="currentColor" stroke-width="2.6" />
            <circle cx="7.5" cy="16.5" r="3.6" fill="currentColor" />
            <path d="M10 14.5l3-3.2" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" />
          </svg>
        </button>
      </div>
      <div :class="styles.scale" aria-hidden="true">
        <span v-for="z in zones" :key="z.key" :style="{ width: `${z.width}px`, background: z.color }" />
      </div>
      <div :class="styles.ends">
        <span v-for="z in zones" :key="z.key" :class="styles.zoneLabel" :style="{ width: `${z.width}px` }">{{ z.text }}</span>
      </div>
    </div>

    <p :class="styles.caption">{{ caption }}</p>

    <!-- Wide screens: the post opens under the strip, pointing at its dot. -->
    <div v-if="selected != null && !narrow" :class="styles.panel" role="region" aria-live="polite" aria-label="The post you picked">
      <span v-if="caretX != null" :class="styles.caret" :style="{ left: `${caretX}px` }" aria-hidden="true" />
      <PostCard v-if="post" :key="post.id" :post="post" :shielded="shielded" />
      <p v-else-if="postFailed" :class="styles.note">Couldn’t load this post. It may have been removed since the page loaded.</p>
      <p v-else :class="styles.note">Loading the post…</p>
      <button type="button" :class="styles.close" @click="close">Close</button>
    </div>

    <!-- Phones: a sheet from the bottom of the screen, above the tab bar, so the dots stay in view above it. -->
    <Teleport to="body">
      <Transition :enter-active-class="styles.sheetMove" :leave-active-class="styles.sheetMove" :enter-from-class="styles.sheetOff" :leave-to-class="styles.sheetOff">
        <section v-if="selected != null && narrow" ref="sheet" :class="styles.sheet" aria-label="The post you picked" aria-live="polite">
          <div :class="styles.sheetHead" @touchstart.passive="swipeStart" @touchend="swipeEnd">
            <span :class="styles.handle" aria-hidden="true" />
            <button type="button" :class="styles.sheetClose" aria-label="Close the post" @click="close">✕</button>
          </div>
          <div :class="styles.sheetBody">
            <PostCard v-if="post" :key="post.id" :post="post" :shielded="shielded" />
            <p v-else-if="postFailed" :class="styles.note">Couldn’t load this post. It may have been removed since the page loaded.</p>
            <p v-else :class="styles.note">Loading the post…</p>
          </div>
        </section>
      </Transition>
    </Teleport>
  </div>
</template>
