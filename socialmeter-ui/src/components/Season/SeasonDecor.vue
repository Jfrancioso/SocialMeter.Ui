<script setup>
import styles from "./SeasonDecor.module.css";

// Purely decorative, fixed behind the page, never interactive. A season gets at most one quiet motif so the content
// stays readable; October has none on purpose (its cue is the wordmark). Motion is off for readers who ask for less.
const props = defineProps({ season: { type: String, default: "thrills" } });

// Holidays: slow snow.
const flakes = Array.from({ length: 18 }, (_, i) => ({ left: (i * 53) % 100, size: 3 + (i % 4), delay: (i * 1.7) % 12, dur: 14 + (i % 5) * 3 }));

// Romance: a few hearts rising.
const hearts = Array.from({ length: 7 }, (_, i) => ({ left: 8 + ((i * 37) % 84), size: 10 + (i % 3) * 4, delay: (i * 2.3) % 10, dur: 18 + (i % 4) * 4 }));
</script>

<template>
  <div :class="styles.layer" aria-hidden="true">
    <template v-if="season === 'holidays'">
      <span
        v-for="(f, i) in flakes"
        :key="i"
        :class="styles.flake"
        :style="{ left: `${f.left}%`, width: `${f.size}px`, height: `${f.size}px`, animationDelay: `${f.delay}s`, animationDuration: `${f.dur}s` }"
      />
    </template>

    <template v-else-if="season === 'romance'">
      <svg
        v-for="(h, i) in hearts"
        :key="i"
        :class="styles.heart"
        :style="{ left: `${h.left}%`, width: `${h.size}px`, animationDelay: `${h.delay}s`, animationDuration: `${h.dur}s` }"
        viewBox="0 0 24 24"
      >
        <path d="M12 21s-7-4.6-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.4-9.5 9-9.5 9z" />
      </svg>
    </template>
  </div>
</template>
