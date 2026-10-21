<script setup>
import { onMounted, ref } from "vue";
import { getHome } from "../api";

import HeroBanner from "../components/HeroBanner/HeroBanner.vue";
import PosterRow from "../components/PosterRow/PosterRow.vue";
import CatRow from '../components/PosterRow/CatRow.vue';

import styles from "./HomePage.module.css";

const featured = ref(null);
const rows = ref([]);
const loading = ref(true);
const error = ref(null);

onMounted(async () => {
  try {
    const data = await getHome("US", 1);
    featured.value = data.featured;
    rows.value = data.rows;
  } catch (e) {
    error.value = e?.message ?? String(e);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div :class="styles.page">
    <div :class="styles.container">
      <h1 :class="styles.title">What to watch</h1>

      <p v-if="loading">Loading…</p>
      <p v-else-if="error" :class="styles.error">{{ error }}</p>

      <template v-else>
        <HeroBanner v-if="featured" :movie="featured" />

        <PosterRow
          v-for="row in rows"
          :key="row.key"
          :rowKey="row.key"
          :title="row.title"
          :items="row.items"
        />

        <CatRow />
      </template>
    </div>
  </div>
</template>
