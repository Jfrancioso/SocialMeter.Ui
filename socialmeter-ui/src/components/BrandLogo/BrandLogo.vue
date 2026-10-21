<script setup>
import styles from "./BrandLogo.module.css";
</script>

<template>
  <router-link to="/" :class="styles.logo" aria-label="SocialMeter home">
    <svg :class="styles.bolt" viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="brand-bolt" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#ffb000" />
          <stop offset="1" stop-color="#ff3d8f" />
        </linearGradient>
      </defs>
      <path d="M36 6 L16 36 h14 l-4 22 L50 26 H36 Z" fill="url(#brand-bolt)" />
    </svg>
    <span :class="styles.text">Social<em>Meter</em></span>
  </router-link>
</template>
