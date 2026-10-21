<script setup>
import styles from "./PosterRow.module.css";
import PosterCard from "../PosterCard/PosterCard.vue";

const props = defineProps({
  rowKey: { type: String, required: true },
  title: { type: String, required: true },
  items: { type: Array, required: true },
});

let scrollerEl = null;

function setScroller(el) {
  scrollerEl = el;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function scroll(dir) {
  if (!scrollerEl) return;

  const page = Math.round(scrollerEl.clientWidth * 0.85);
  const amount = page * dir;

  const maxLeft = Math.max(0, scrollerEl.scrollWidth - scrollerEl.clientWidth);
  const nextLeft = clamp(scrollerEl.scrollLeft + amount, 0, maxLeft);

  scrollerEl.scrollTo({ left: nextLeft, behavior: "smooth" });
}
</script>

<template>
  <section :class="styles.row">
    <div :class="styles.head">
      <h2 :class="styles.title">{{ title }}</h2>
      <span :class="styles.more">See more ›</span>
    </div>

    <div :class="styles.shell">
      <!-- LEFT GUTTER -->
      <div :class="styles.gutter">
        <button :class="styles.nav" @click="scroll(-1)" aria-label="Scroll left">
          ‹
        </button>
      </div>

      <!-- SCROLLER -->
      <div :class="styles.scroll" :ref="setScroller">
        <template v-if="items?.length">
          <PosterCard
            v-for="m in items"
            :key="m.tmdbId"
            :movie="m"
          />
        </template>

        <div v-else :class="styles.empty">
          Nothing to show yet.
        </div>
      </div>

      <!-- RIGHT GUTTER -->
      <div :class="styles.gutter">
        <button :class="styles.nav" @click="scroll(1)" aria-label="Scroll right">
          ›
        </button>
      </div>
    </div>
  </section>
</template>
