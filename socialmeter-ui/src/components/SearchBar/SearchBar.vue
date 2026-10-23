<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { getSearchSuggestions, searchTitles } from "../../api";
import { tmdbImage } from "../../utils/tmdbImage";
import { mediaLabel, yearOf } from "../../utils/format";
import { useSnapshots } from "../../composables/useSnapshots";
import MeterBadge from "../Meter/MeterBadge.vue";
import styles from "./SearchBar.module.css";

const emit = defineEmits(["navigate"]);
const router = useRouter();
const { ensure: ensureReadings, get: reading } = useSnapshots();

const text = ref("");
const suggestions = ref([]);
const open = ref(false);
const loading = ref(false);
const active = ref(-1);
const root = ref(null);

// Before anything is typed: what people are posting about this week, then what's trending. Fetched on first focus and
// kept for ten minutes; nothing about what anyone searches is recorded.
const idle = ref(null); // { talkedAbout: [{ title, posts }], trending: [title] }
let idleFetchedAt = 0;
const idleItems = computed(() =>
  idle.value
    ? [
        ...idle.value.talkedAbout.map((t) => ({ title: t.title, posts: t.posts, group: "talked" })),
        ...idle.value.trending.map((t) => ({ title: t, group: "trending" }))
      ]
    : []
);
const showingIdle = computed(() => !text.value.trim() && idleItems.value.length > 0);
const items = computed(() => (showingIdle.value ? idleItems.value.map((i) => i.title) : suggestions.value));

async function loadIdle() {
  if (idle.value && Date.now() - idleFetchedAt < 10 * 60_000) return;
  try {
    idle.value = await getSearchSuggestions();
    idleFetchedAt = Date.now();
    ensureReadings(idleItems.value.map((i) => i.title));
  } catch {
    // no suggestions; the box still searches
  }
}

async function onFocus() {
  if (text.value.trim()) {
    if (suggestions.value.length) open.value = true;
    return;
  }
  await loadIdle();
  if (!text.value.trim() && idleItems.value.length) open.value = true;
}

let timer = null;
let controller = null;

watch(text, (q) => {
  clearTimeout(timer);
  controller?.abort();
  active.value = -1;

  if (!q || q.trim().length < 2) {
    suggestions.value = [];
    // Cleared back to empty while focused: the idle lists come back.
    open.value = !q.trim() && idleItems.value.length > 0 && root.value?.contains(document.activeElement);
    return;
  }
  timer = setTimeout(() => fetchSuggestions(q.trim()), 250);
});

async function fetchSuggestions(q) {
  loading.value = true;
  controller = new AbortController();
  try {
    const data = await searchTitles(q, {}, { signal: controller.signal });
    suggestions.value = data.items.slice(0, 7);
    open.value = true;
  } catch (err) {
    if (err?.name !== "AbortError") suggestions.value = [];
  } finally {
    loading.value = false;
  }
}

function go(title) {
  close();
  text.value = "";
  emit("navigate");
  router.push({ name: "title", params: { type: title.mediaType, id: title.tmdbId } });
}

function submit() {
  const q = text.value.trim();
  if (active.value >= 0 && items.value[active.value]) {
    go(items.value[active.value]);
    return;
  }
  if (!q) return;
  close();
  emit("navigate");
  router.push({ name: "search", query: { q } });
}

function close() {
  open.value = false;
  active.value = -1;
}

function onKey(e) {
  if (!open.value || !items.value.length) return;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    active.value = (active.value + 1) % items.value.length;
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    active.value = (active.value - 1 + items.value.length) % items.value.length;
  } else if (e.key === "Escape") {
    close();
  }
}

function onDocumentClick(e) {
  if (root.value && !root.value.contains(e.target)) close();
}

onMounted(() => document.addEventListener("mousedown", onDocumentClick));
onBeforeUnmount(() => {
  document.removeEventListener("mousedown", onDocumentClick);
  clearTimeout(timer);
  controller?.abort();
});
</script>

<template>
  <div ref="root" :class="styles.wrap">
    <form :class="styles.form" role="search" @submit.prevent="submit">
      <svg :class="styles.icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        v-model="text"
        :class="styles.input"
        type="search"
        placeholder="Search movies, shows and games…"
        autocomplete="off"
        spellcheck="false"
        aria-label="Search movies, shows and games"
        @keydown="onKey"
        @focus="onFocus"
      />
      <span v-if="loading" :class="styles.spinner" aria-hidden="true" />
      <kbd v-else-if="!text" :class="styles.kbd">⏎</kbd>
    </form>

    <div v-if="open && showingIdle" :class="styles.dropdown" role="listbox" aria-label="Suggestions">
      <template v-for="(item, i) in idleItems" :key="`${item.group}-${item.title.mediaType}-${item.title.tmdbId}`">
        <div v-if="i === 0 || idleItems[i - 1].group !== item.group" :class="styles.group">
          {{ item.group === "talked" ? "Talked about now" : "Trending" }}
        </div>
        <button
          type="button"
          :class="[styles.item, i === active && styles.itemActive]"
          role="option"
          :aria-selected="i === active"
          @mouseenter="active = i"
          @click="go(item.title)"
        >
          <img v-if="item.title.posterPath" :src="tmdbImage(item.title.posterPath, 'w92')" :alt="''" :class="styles.poster" loading="lazy" />
          <div v-else :class="styles.posterEmpty" />
          <div :class="styles.info">
            <div :class="styles.name">{{ item.title.name }}</div>
            <div :class="styles.meta">
              <span :class="[styles.type, item.title.mediaType === 'tv' && styles.typeTv, item.title.mediaType === 'game' && styles.typeGame]">{{ mediaLabel(item.title.mediaType) }}</span>
              <span v-if="yearOf(item.title.releaseDate)">{{ yearOf(item.title.releaseDate) }}</span>
              <span v-if="item.posts">
                {{ item.posts }} {{ item.title.mediaType === "game" ? "reviews" : "posts" }} · {{ idle.windowDays === 1 ? "today" : `${idle.windowDays} days` }}
              </span>
            </div>
          </div>
          <MeterBadge :reading="reading(item.title.mediaType, item.title.tmdbId)" :class="styles.badge" />
        </button>
      </template>
    </div>

    <div v-else-if="open && suggestions.length" :class="styles.dropdown" role="listbox">
      <button
        v-for="(t, i) in suggestions"
        :key="`${t.mediaType}-${t.tmdbId}`"
        type="button"
        :class="[styles.item, i === active && styles.itemActive]"
        role="option"
        :aria-selected="i === active"
        @mouseenter="active = i"
        @click="go(t)"
      >
        <img v-if="t.posterPath" :src="tmdbImage(t.posterPath, 'w92')" :alt="''" :class="styles.poster" loading="lazy" />
        <div v-else :class="styles.posterEmpty" />
        <div :class="styles.info">
          <div :class="styles.name">{{ t.name }}</div>
          <div :class="styles.meta">
            <span :class="[styles.type, t.mediaType === 'tv' && styles.typeTv, t.mediaType === 'game' && styles.typeGame]">{{ mediaLabel(t.mediaType) }}</span>
            <span v-if="yearOf(t.releaseDate)">{{ yearOf(t.releaseDate) }}</span>
          </div>
        </div>
      </button>
      <button type="button" :class="styles.all" @click="submit">See all results for “{{ text.trim() }}”</button>
    </div>
  </div>
</template>
