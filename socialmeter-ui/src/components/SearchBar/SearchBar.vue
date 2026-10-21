<script setup>
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import styles from "./SearchBar.module.css";

const router = useRouter();

const props = defineProps({
  modelValue: { type: String, default: "" },
  category: { type: String, default: "all" },
  categories: {
    type: Array,
    default: () => [
      { value: "all", label: "All" },
      { value: "movies", label: "Movies" },
      { value: "tv", label: "TV" },
      { value: "people", label: "People" }
    ]
  },
  placeholder: { type: String, default: "Search SocialMeter…" }
});

const emit = defineEmits([
  "update:modelValue",
  "update:category",
  "submit",
  "clear"
]);

const text = ref(props.modelValue);
const cat = ref(props.category);

// Autocomplete state
const suggestions = ref([]);
const showDropdown = ref(false);
const loading = ref(false);
let debounceTimer = null;

watch(() => props.modelValue, v => (text.value = v ?? ""));
watch(() => props.category, v => (cat.value = v ?? "all"));

// Debounced search
watch(text, (newQuery) => {
  clearTimeout(debounceTimer);
  
  if (!newQuery || newQuery.length < 2) {
    suggestions.value = [];
    showDropdown.value = false;
    return;
  }
  
  debounceTimer = setTimeout(async () => {
    await fetchSuggestions(newQuery);
  }, 300);
});

// Fetch suggestions
async function fetchSuggestions(query) {
  loading.value = true;
  try {
    const response = await fetch(
      `https://localhost:7101/api/movies/search?query=${encodeURIComponent(query)}`
    );
    const data = await response.json();
    
    // DEBUG: Log the data to see what we're getting
    console.log('Search results:', data.items);
    
    suggestions.value = data.items.slice(0, 8);
    showDropdown.value = true;
  } catch (err) {
    console.error('Search failed:', err);
    suggestions.value = [];
  } finally {
    loading.value = false;
  }
}

// FIXED: Use tmdbId instead of id
function selectSuggestion(movie) {
  console.log('Selected movie:', movie); // DEBUG
  showDropdown.value = false;
  text.value = '';
  emit("update:modelValue", '');
  router.push(`/movie/${movie.tmdbId}`);
}

function updateText(v) {
  text.value = v;
  emit("update:modelValue", v);
}

function updateCat(v) {
  cat.value = v;
  emit("update:category", v);
}

function onSubmit() {
  showDropdown.value = false;
  emit("submit", { query: text.value.trim(), category: cat.value });
}

function onClear() {
  updateText("");
  suggestions.value = [];
  showDropdown.value = false;
  emit("clear");
}

const hasText = computed(() => (text.value?.length ?? 0) > 0);
</script>

<template>
  <div :class="styles.searchWrapper">
    <form :class="styles.search" role="search" @submit.prevent="onSubmit">
      <!-- Category -->
      <label :class="styles.selectWrap" aria-label="Search category">
        <select :class="styles.select" :value="cat" @change="updateCat($event.target.value)">
          <option v-for="c in categories" :key="c.value" :value="c.value">
            {{ c.label }}
          </option>
        </select>
        <span :class="styles.caret" aria-hidden="true">▾</span>
      </label>

      <!-- Input -->
      <div :class="styles.inputWrap">
        <span :class="styles.icon" aria-hidden="true">⌕</span>

        <input
          :class="styles.input"
          :value="text"
          :placeholder="placeholder"
          autocomplete="off"
          spellcheck="false"
          @input="updateText($event.target.value)"
        />

        <button
          v-if="hasText"
          type="button"
          :class="styles.clear"
          aria-label="Clear search"
          @click="onClear"
        >
          ×
        </button>
      </div>

      <!-- Submit -->
      <button type="submit" :class="styles.submit" aria-label="Search">
        🔎
      </button>
    </form>

    <!-- Dropdown -->
    <div v-if="showDropdown && suggestions.length > 0" :class="styles.dropdown">
      <div
        v-for="movie in suggestions"
        :key="movie.tmdbId"
        :class="styles.suggestion"
        @click="selectSuggestion(movie)"
      >
        <img 
          v-if="movie.posterPath" 
          :src="`https://image.tmdb.org/t/p/w92${movie.posterPath}`" 
          :alt="movie.title"
          :class="styles.poster"
        />
        <div v-else :class="styles.posterPlaceholder">
          🎬
        </div>
        <div :class="styles.info">
          <div :class="styles.suggestionTitle">{{ movie.title }}</div>
          <div :class="styles.year">{{ movie.releaseDate?.substring(0, 4) || 'N/A' }}</div>
        </div>
      </div>
      
      <div :class="styles.seeAll" @click="onSubmit">
        See all results for "{{ text }}"
      </div>
    </div>

    <div v-if="loading && text.length >= 2" :class="styles.loadingIndicator">
      Searching...
    </div>
  </div>
</template>