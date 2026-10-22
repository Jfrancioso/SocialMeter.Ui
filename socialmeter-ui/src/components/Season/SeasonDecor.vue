<script setup>
import styles from "./SeasonDecor.module.css";

// Purely decorative, fixed behind the page, never interactive. Each season gets at most one quiet motif so the
// content stays readable; colours alone carry the rest (styles/seasons.css). Motion is off for readers who ask for less.
const props = defineProps({ season: { type: String, default: "thrills" } });

// Halloween: a low moon, a drift of fog, and a few bats crossing. Positions are fixed so the scene is the same for everyone.
const bats = [
  { left: 6, top: 18, size: 26, delay: 0, dur: 38 },
  { left: 22, top: 9, size: 18, delay: 7, dur: 46 },
  { left: 41, top: 24, size: 22, delay: 15, dur: 41 },
  { left: 63, top: 12, size: 16, delay: 3, dur: 52 },
  { left: 78, top: 21, size: 24, delay: 11, dur: 44 },
  { left: 90, top: 7, size: 14, delay: 20, dur: 49 }
];

// Holidays: slow snow.
const flakes = Array.from({ length: 18 }, (_, i) => ({ left: (i * 53) % 100, size: 3 + (i % 4), delay: (i * 1.7) % 12, dur: 14 + (i % 5) * 3 }));

// Romance: a few hearts rising.
const hearts = Array.from({ length: 7 }, (_, i) => ({ left: 8 + ((i * 37) % 84), size: 10 + (i % 3) * 4, delay: (i * 2.3) % 10, dur: 18 + (i % 4) * 4 }));
</script>

<template>
  <div :class="styles.layer" aria-hidden="true">
    <template v-if="season === 'halloween'">
      <div :class="styles.moon" />
      <div :class="styles.fog" />
      <svg
        v-for="(b, i) in bats"
        :key="i"
        :class="styles.bat"
        :style="{ left: `${b.left}%`, top: `${b.top}%`, width: `${b.size}px`, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s` }"
        viewBox="0 0 64 32"
      >
        <path d="M32 6c-3 6-7 9-13 9-5 0-9-3-13-8 2 7 2 12 0 17 5-4 9-5 13-3 3 2 5 5 6 9h14c1-4 3-7 6-9 4-2 8-1 13 3-2-5-2-10 0-17-4 5-8 8-13 8-6 0-10-3-13-9z" />
      </svg>
    </template>

    <template v-else-if="season === 'holidays'">
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
