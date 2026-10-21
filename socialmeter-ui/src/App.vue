<script setup>
import NavBar from "./components/NavBar/NavBar.vue";
</script>

<template>
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
