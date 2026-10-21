<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import styles from "./NavBar.module.css";
import BrandLogo from "../BrandLogo/BrandLogo.vue";
import SearchBar from "../SearchBar/SearchBar.vue";

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
        <nav :class="styles.links" aria-label="Primary">
          <router-link :class="styles.link" :to="{ name: 'browse', params: { type: 'movie' } }">Movies</router-link>
          <router-link :class="styles.link" :to="{ name: 'browse', params: { type: 'tv' } }">TV</router-link>
          <router-link :class="styles.link" :to="{ name: 'browse', params: { type: 'game' } }">Games</router-link>
          <router-link :class="[styles.link, styles.linkMuted]" :to="{ name: 'how-it-works' }">How it works</router-link>
        </nav>
      </div>

      <div :class="[styles.center, searchOpen && styles.centerOpen]">
        <SearchBar @navigate="searchOpen = false" />
      </div>

      <div :class="styles.right">
        <button :class="styles.searchToggle" type="button" aria-label="Toggle search" @click="searchOpen = !searchOpen">
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
</template>
