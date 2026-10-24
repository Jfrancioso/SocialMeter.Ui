<script setup>
import { inject, onBeforeUnmount, onMounted, ref } from "vue";
import styles from "./NavBar.module.css";
import BrandLogo from "../BrandLogo/BrandLogo.vue";
import SearchBar from "../SearchBar/SearchBar.vue";
import { useShelfLink } from "../../composables/useShelfLink";

// Provided by App.vue; the only seasonal thing in the nav is the small tag in October.
const season = inject("season", ref("thrills"));

// The private reading shelf: a link for admins and readers only (useShelfLink).
const { showShelf } = useShelfLink();

const scrolled = ref(false);
const searchOpen = ref(false);

function onScroll() {
  scrolled.value = window.scrollY > 8;
}

onMounted(() => {
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
});
onBeforeUnmount(() => window.removeEventListener("scroll", onScroll));
</script>

<template>
  <header :class="[styles.nav, scrolled && styles.scrolled]">
    <div :class="styles.inner">
      <div :class="styles.left">
        <BrandLogo />
        <router-link v-if="season === 'halloween'" :class="styles.seasonTag" to="/#seasonal" title="Horror is in season: this month's picks are on the home page">
          Horror season
        </router-link>
        <nav :class="styles.links" aria-label="Primary">
          <router-link :class="styles.link" :to="{ name: 'browse', params: { type: 'movie' } }">Movies</router-link>
          <router-link :class="styles.link" :to="{ name: 'browse', params: { type: 'tv' } }">TV</router-link>
          <router-link :class="styles.link" :to="{ name: 'browse', params: { type: 'game' } }">Games</router-link>
          <router-link :class="[styles.link, styles.linkMuted]" :to="{ name: 'how-it-works' }">How it works</router-link>
          <router-link v-if="showShelf" :class="[styles.link, styles.linkShelf]" :to="{ name: 'shelf' }">Shelf</router-link>
        </nav>
      </div>

      <div :class="[styles.center, searchOpen && styles.centerOpen]">
        <SearchBar @navigate="searchOpen = false" />
      </div>

      <div :class="styles.right">
        <button :class="styles.searchToggle" type="button" aria-label="Toggle search" :aria-expanded="searchOpen" @click="searchOpen = !searchOpen">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </button>
        <span :class="styles.live">
          <span :class="styles.liveDot" />
          Live pulse
        </span>
      </div>
    </div>
  </header>

  <!-- Phones: primary navigation moves to a bottom tab bar, the pattern every phone app uses, so the top bar is just the brand and search.
       A sibling of the header on purpose: inside it, the header's backdrop-filter would become its containing block and pin it to the top. -->
  <nav :class="styles.tabs" aria-label="Primary (mobile)">
      <router-link :class="styles.tab" :to="{ name: 'home' }" exact-active-class="is-active">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 11 9-8 9 8" /><path d="M5 10v10h5v-6h4v6h5V10" /></svg>
        <span>Home</span>
      </router-link>
      <router-link :class="styles.tab" :to="{ name: 'browse', params: { type: 'movie' } }">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 4v16M17 4v16M3 9h4M17 9h4M3 15h4M17 15h4" /></svg>
        <span>Movies</span>
      </router-link>
      <router-link :class="styles.tab" :to="{ name: 'browse', params: { type: 'tv' } }">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M8 21h8M12 18v3" /></svg>
        <span>TV</span>
      </router-link>
      <router-link :class="styles.tab" :to="{ name: 'browse', params: { type: 'game' } }">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8h12a4 4 0 0 1 4 4v2a4 4 0 0 1-4 4h-1l-2-2H9l-2 2H6a4 4 0 0 1-4-4v-2a4 4 0 0 1 4-4Z" /><path d="M8 12v3M6.5 13.5h3M15 13h.01M17.5 11.5h.01" /></svg>
        <span>Games</span>
      </router-link>
      <router-link :class="styles.tab" :to="{ name: 'how-it-works' }">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" /></svg>
        <span>How</span>
      </router-link>
      <router-link v-if="showShelf" :class="styles.tab" :to="{ name: 'shelf' }">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z" /><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" /></svg>
        <span>Shelf</span>
      </router-link>
  </nav>
</template>
