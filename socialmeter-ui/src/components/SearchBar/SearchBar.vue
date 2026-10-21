<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { searchTitles } from "../../api";
import { tmdbImage } from "../../utils/tmdbImage";
import { mediaLabel, yearOf } from "../../utils/format";
import styles from "./SearchBar.module.css";

const emit = defineEmits(["navigate"]);
const router = useRouter();

const text = ref("");
const suggestions = ref([]);
const open = ref(false);
const loading = ref(false);
const active = ref(-1);
const root = ref(null);

let timer = null;
let controller = null;

watch(text, (q) => {
  clearTimeout(timer);
  controller?.abort();
  active.value = -1;

  if (!q || q.trim().length < 2) {
    suggestions.value = [];
    open.value = false;
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
  if (!q) return;
  if (active.value >= 0 && suggestions.value[active.value]) {
    go(suggestions.value[active.value]);
    return;
  }
  close();
  emit("navigate");
  router.push({ name: "search", query: { q } });
}

function close() {
  open.value = false;
  active.value = -1;
}

function onKey(e) {
  if (!open.value || !suggestions.value.length) return;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    active.value = (active.value + 1) % suggestions.value.length;
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    active.value = (active.value - 1 + suggestions.value.length) % suggestions.value.length;
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
        placeholder="Search movies and shows…"
        autocomplete="off"
        spellcheck="false"
        aria-label="Search movies and shows"
        @keydown="onKey"
        @focus="suggestions.length && (open = true)"
      />
      <span v-if="loading" :class="styles.spinner" aria-hidden="true" />
      <kbd v-else-if="!text" :class="styles.kbd">⏎</kbd>
    </form>

    <div v-if="open && suggestions.length" :class="styles.dropdown" role="listbox">
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
            <span :class="[styles.type, t.mediaType === 'tv' && styles.typeTv]">{{ mediaLabel(t.mediaType) }}</span>
            <span v-if="yearOf(t.releaseDate)">{{ yearOf(t.releaseDate) }}</span>
          </div>
        </div>
      </button>
      <button type="button" :class="styles.all" @click="submit">See all results for “{{ text.trim() }}”</button>
    </div>
  </div>
</template>
