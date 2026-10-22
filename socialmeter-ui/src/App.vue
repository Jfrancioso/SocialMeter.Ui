<script setup>
import { provide } from "vue";
import NavBar from "./components/NavBar/NavBar.vue";
import SeasonDecor from "./components/Season/SeasonDecor.vue";
import { useSeason } from "./composables/useSeason";

// The site dresses lightly for the season (a horror wordmark in October, snow in December, ...); see docs/SEASONAL-THEMES.md.
const { season } = useSeason();
provide("season", season);
</script>

<template>
  <SeasonDecor :season="season" />
  <NavBar />
  <main class="app-main">
    <router-view v-slot="{ Component }">
      <transition name="page" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </main>
  <footer class="app-footer">
    <span>SocialMeter reads Reddit and X to measure how people really feel about movies, shows and games.</span>
    <span>Title data and images from TMDB and Steam. Ratings from TMDB, IMDb, Rotten Tomatoes, Metacritic and Steam.</span>
  </footer>
</template>

<style>
.app-main {
  min-height: calc(100vh - var(--nav-h));
  padding-top: var(--nav-h);
}

.app-footer {
  max-width: var(--page-w);
  margin: 0 auto;
  padding: 40px var(--page-x) 48px;
  display: grid;
  gap: 6px;
  color: var(--text-3);
  font-size: 12px;
  border-top: 1px solid var(--line);
}

/* Phones: leave room for the bottom tab bar (and the home indicator on iOS) under every page. */
@media (max-width: 640px) {
  .app-footer {
    padding-bottom: calc(48px + var(--tabbar-h) + env(safe-area-inset-bottom, 0px));
  }
}

.page-enter-active,
.page-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.page-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.page-leave-to {
  opacity: 0;
}
</style>
