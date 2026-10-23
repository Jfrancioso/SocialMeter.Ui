<script setup>
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getComingSoonGames, getNewGames, getPopular, getTopRated, getTrending } from "../api";
import { useSnapshots } from "../composables/useSnapshots";
import TitleGrid from "../components/TitleGrid/TitleGrid.vue";
import styles from "./BrowsePage.module.css";

const props = defineProps({
  type: { type: String, required: true }
});

const route = useRoute();
const router = useRouter();
const { ensure } = useSnapshots();

const screenTabs = [
  { key: "trending", label: "Trending", fetch: (type, page) => getTrending(type, page) },
  { key: "popular", label: "Popular", fetch: (type, page) => getPopular(type, page) },
  { key: "top-rated", label: "Top rated", fetch: (type, page) => getTopRated(type, page) }
];

// Steam has no "top rated" list; its lists are about what's selling and being played right now. Most played opens
// first: Steam's top-sellers list is often only a handful of games once bundles and DLC are filtered out.
const gameTabs = [
  { key: "popular", label: "Most played", fetch: (type, page) => getPopular(type, page) },
  { key: "trending", label: "Top sellers", fetch: (type, page) => getTrending(type, page) },
  { key: "new", label: "New releases", fetch: (type, page) => getNewGames(page) },
  { key: "coming-soon", label: "Coming soon", fetch: (type, page) => getComingSoonGames(page) }
];

const tabs = computed(() => (props.type === "game" ? gameTabs : screenTabs));
const tab = computed(() => tabs.value.find((t) => t.key === route.query.tab) ?? tabs.value[0]);
const heading = computed(() => ({ tv: "TV shows", game: "Games" }[props.type] ?? "Movies"));

const items = ref([]);
const page = ref(1);
const totalPages = ref(0);
const loading = ref(false);
const error = ref(null);

async function load(nextPage = 1) {
  loading.value = true;
  error.value = null;
  try {
    const data = await tab.value.fetch(props.type, nextPage);
    items.value = nextPage === 1 ? data.items : [...items.value, ...data.items];
    page.value = data.page;
    totalPages.value = data.totalPages;
    ensure(data.items);
  } catch (e) {
    error.value = e?.message ?? String(e);
  } finally {
    loading.value = false;
  }
}

function selectTab(key) {
  router.replace({ query: { ...route.query, tab: key } });
}

watch(() => [props.type, tab.value.key], () => load(1), { immediate: true });
</script>

<template>
  <div :class="styles.page">
    <div class="container">
      <header :class="styles.head">
        <div>
          <span :class="styles.eyebrow">Browse</span>
          <h1 :class="styles.title">{{ heading }}</h1>
        </div>
        <div :class="styles.tabs" role="tablist">
          <button
            v-for="t in tabs"
            :key="t.key"
            type="button"
            role="tab"
            :aria-selected="t.key === tab.key"
            :class="['chip', t.key === tab.key && 'is-active']"
            @click="selectTab(t.key)"
          >
            {{ t.label }}
          </button>
        </div>
      </header>

      <div v-if="error" class="error-box">{{ error }}</div>

      <TitleGrid v-else-if="items.length" :items="items" />

      <div v-else-if="loading" :class="styles.skeletons">
        <div v-for="i in 12" :key="i" :class="[styles.cardSkeleton, 'skeleton']" />
      </div>

      <div v-if="page < totalPages" :class="styles.more">
        <button type="button" class="btn" :disabled="loading" @click="load(page + 1)">
          {{ loading ? "Loading…" : "Load more" }}
        </button>
      </div>
    </div>
  </div>
</template>
