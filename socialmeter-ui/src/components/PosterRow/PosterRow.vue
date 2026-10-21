<script setup>
import { ref } from "vue";
import PosterCard from "../PosterCard/PosterCard.vue";
import styles from "./PosterRow.module.css";

defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: "" },
  items: { type: Array, required: true },
  moreTo: { type: Object, default: null }
});

const scroller = ref(null);

function scroll(dir) {
  const el = scroller.value;
  if (!el) return;
  const amount = Math.round(el.clientWidth * 0.85) * dir;
  el.scrollBy({ left: amount, behavior: "smooth" });
}
</script>

<template>
  <section :class="styles.row">
    <div :class="styles.head">
      <div>
        <h2 :class="styles.title">{{ title }}</h2>
        <p v-if="subtitle" :class="styles.subtitle">{{ subtitle }}</p>
      </div>
      <div :class="styles.controls">
        <router-link v-if="moreTo" :to="moreTo" :class="styles.more">See all</router-link>
        <button :class="styles.nav" type="button" aria-label="Scroll left" @click="scroll(-1)">‹</button>
        <button :class="styles.nav" type="button" aria-label="Scroll right" @click="scroll(1)">›</button>
      </div>
    </div>

    <div ref="scroller" :class="[styles.scroll, 'no-scrollbar']">
      <template v-if="items?.length">
        <PosterCard v-for="t in items" :key="`${t.mediaType}-${t.tmdbId}`" :title="t" />
      </template>
      <div v-else :class="styles.empty">Nothing to show yet.</div>
    </div>
  </section>
</template>
