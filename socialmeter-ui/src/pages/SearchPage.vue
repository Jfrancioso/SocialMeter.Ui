<script setup>
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { searchTitles } from "../api";
import { useSnapshots } from "../composables/useSnapshots";
import TitleGrid from "../components/TitleGrid/TitleGrid.vue";
import styles from "./SearchPage.module.css";

const route = useRoute();
const router = useRouter();
const { ensure } = useSnapshots();

const q = computed(() => String(route.query.q ?? "").trim());
const type = computed(() => (["movie", "tv"].includes(route.query.type) ? route.query.type : ""));

const items = ref([]);
const page = ref(1);
const totalPages = ref(0);
const totalResults = ref(0);
const loading = ref(false);
const error = ref(null);

const filters = [
  { value: "", label: "All" },
  { value: "movie", label: "Movies" },
  { value: "tv", label: "TV" }
];

// Tracked titles first; the rest are findable but locked, in a group the reader can expand.
const tracked = computed(() => items.value.filter((t) => t.tracked !== false));
const lockedItems = computed(() => items.value.filter((t) => t.tracked === false));
const showLocked = ref(false);

async function load(nextPage = 1) {
  if (!q.value) {
    items.value = [];
    totalResults.value = 0;
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    const data = await searchTitles(q.value, { type: type.value || undefined, page: nextPage });
    items.value = nextPage === 1 ? data.items : [...items.value, ...data.items];
    page.value = data.page;
    totalPages.value = data.totalPages;
    totalResults.value = data.totalResults;
    ensure(data.items);
  } catch (e) {
    error.value = e?.message ?? String(e);
  } finally {
    loading.value = false;
  }
}

function setType(value) {
  router.replace({ query: { ...route.query, type: value || undefined } });
}

watch([q, type], () => load(1), { immediate: true });
</script>

<template>
  <div :class="styles.page">
    <div class="container">
      <header :class="styles.head">
        <div>
          <span :class="styles.eyebrow">Search</span>
          <h1 :class="styles.title">
            <template v-if="q">“{{ q }}”</template>
            <template v-else>Type something to search</template>
          </h1>
          <p v-if="q && !loading" :class="styles.count">
            {{ totalResults ? `${totalResults} result${totalResults === 1 ? "" : "s"}` : "No results" }}
          </p>
        </div>
        <div :class="styles.filters">
          <button
            v-for="f in filters"
            :key="f.value"
            type="button"
            :class="['chip', type === f.value && 'is-active']"
            @click="setType(f.value)"
          >
            {{ f.label }}
          </button>
        </div>
      </header>

      <div v-if="error" class="error-box">{{ error }}</div>

      <template v-else-if="items.length">
        <TitleGrid v-if="tracked.length" :items="tracked" />
        <div v-else :class="styles.empty">
          <strong>Nothing tracked matches “{{ q }}”.</strong>
          <span>SocialMeter only measures what’s current, trending, seasonal or electric. Matches outside that set are below.</span>
        </div>

        <section v-if="lockedItems.length" :class="styles.lockedSection">
          <button type="button" :class="styles.lockedToggle" :aria-expanded="showLocked" @click="showLocked = !showLocked">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
            {{ lockedItems.length }} not tracked right now
            <span :class="styles.lockedCaret">{{ showLocked ? "▴" : "▾" }}</span>
          </button>
          <p :class="styles.lockedHint">Still browsable with critic ratings, but no social reading until they’re current or trending.</p>
          <TitleGrid v-if="showLocked" :items="lockedItems" />
        </section>
      </template>

      <div v-else-if="loading" :class="styles.skeletons">
        <div v-for="i in 12" :key="i" :class="[styles.cardSkeleton, 'skeleton']" />
      </div>

      <div v-else-if="q" :class="styles.empty">
        <strong>Nothing found for “{{ q }}”.</strong>
        <span>Try a different spelling, or the original title.</span>
      </div>

      <div v-if="page < totalPages" :class="styles.more">
        <button type="button" class="btn" :disabled="loading" @click="load(page + 1)">
          {{ loading ? "Loading…" : "Load more" }}
        </button>
      </div>
    </div>
  </div>
</template>
