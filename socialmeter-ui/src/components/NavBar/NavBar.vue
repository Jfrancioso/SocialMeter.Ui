<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router"; // ADD THIS LINE
import styles from "./NavBar.module.css";

import BrandLogo from "../BrandLogo/BrandLogo.vue";
import SearchBar from "../SearchBar/SearchBar.vue";

const router = useRouter();

const query = ref("");
const category = ref("all");
const menuOpen = ref(false);

function toggleMenu() {
  menuOpen.value = !menuOpen.value;
}

function goHome() {
  router.push('/');
}

function onSearch(payload) {
  console.log("Search:", payload);
}
</script>

<template>
  <header :class="styles.nav">
    <div :class="styles.inner">
      <!-- LEFT -->
      <div :class="styles.left">
        <!-- ADD CLICK HANDLER HERE -->
        <div @click="goHome" :class="styles.brandWrapper">
          <BrandLogo :class="styles.brand" />
        </div>
        
        <button :class="styles.menuBtn" @click="toggleMenu" aria-label="Open menu">
          <span :class="styles.menuIcon">≡</span>
          <span :class="styles.menuText">Menu</span>
        </button>
      </div>

      <!-- CENTER -->
      <div :class="styles.center">
        <SearchBar
          v-model="query"
          v-model:category="category"
          placeholder="Search movies, shows, people…"
          @submit="onSearch"
        />
      </div>

      <!-- RIGHT -->
      <div :class="styles.right">
        <a href="#" :class="styles.link">Watchlist</a>
        <a href="#" :class="styles.link">Sign in</a>
      </div>
    </div>

    <!-- Simple dropdown menu (placeholder) -->
    <div v-if="menuOpen" :class="styles.menuPanel">
      <div :class="styles.menuInner">
        <a href="#" :class="styles.menuItem">Trending</a>
        <a href="#" :class="styles.menuItem">Now Playing</a>
        <a href="#" :class="styles.menuItem">Top Picks</a>
      </div>
    </div>
  </header>
</template>