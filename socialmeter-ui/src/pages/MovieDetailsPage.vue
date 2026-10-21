<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { getMovieById } from "../api";

import MovieHero from "../components/MovieHero/MovieHero.vue";
import styles from "./MovieDetailsPage.module.css";

const route = useRoute();
const id = computed(() => Number(route.params.id));

const movie = ref(null);
const loading = ref(true);
const error = ref(null);
const notFound = ref(false);

async function load() {
  loading.value = true;
  error.value = null;
  notFound.value = false;

  try {
    movie.value = await getMovieById(id.value);
  } catch (e) {
    const msg = e?.message ?? String(e);
    if (msg.includes("404")) notFound.value = true;
    else error.value = msg;
  } finally {
    loading.value = false;
  }
}

watch(id, load);
onMounted(load);
</script>

<template>
  <div :class="styles.page">
    <div :class="styles.container">
      <p v-if="loading">Loading…</p>
      <p v-else-if="notFound">Movie not found.</p>
      <p v-else-if="error" :class="styles.error">{{ error }}</p>

      <template v-else>
        <MovieHero :movie="movie" />

        <section :class="styles.section">
          <h2 :class="styles.h2">Overview</h2>
          <p :class="styles.overview">
            {{ movie.overview || "No overview available." }}
          </p>
        </section>
      </template>
    </div>
  </div>
</template>
