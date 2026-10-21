<script setup>
defineProps({
  platform: { type: String, required: true },
  size: { type: Number, default: 16 }
});
</script>

<template>
  <!-- Reddit: the alien's face, simplified -->
  <svg v-if="platform === 'reddit'" :width="size" :height="size" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="11" fill="var(--reddit)" />
    <ellipse cx="12" cy="13.6" rx="6.4" ry="4.6" fill="#fff" />
    <circle cx="9.6" cy="13" r="1" fill="var(--reddit)" />
    <circle cx="14.4" cy="13" r="1" fill="var(--reddit)" />
    <path d="M9.6 15.8c1.4 1.1 3.4 1.1 4.8 0" stroke="var(--reddit)" stroke-width="0.9" fill="none" stroke-linecap="round" />
    <circle cx="5.8" cy="12.2" r="1.3" fill="#fff" />
    <circle cx="18.2" cy="12.2" r="1.3" fill="#fff" />
    <path d="M12 9.2l1-3.6 3 .8" stroke="#fff" stroke-width="0.9" fill="none" stroke-linecap="round" />
    <circle cx="16.4" cy="6.4" r="1" fill="#fff" />
  </svg>

  <!-- X -->
  <svg v-else-if="platform === 'x'" :width="size" :height="size" viewBox="0 0 24 24" aria-hidden="true">
    <rect width="24" height="24" rx="6" fill="#000" stroke="rgba(255,255,255,0.25)" />
    <path d="M6.5 5.5h3.2l3.1 4.3 3.7-4.3h1.9l-4.7 5.5 5.3 7.5h-3.2l-3.4-4.7-4.1 4.7H6.4l5.1-5.9z" fill="#fff" />
  </svg>

  <!-- Steam: the valve/piston mark, simplified -->
  <svg v-else-if="platform === 'steam'" :width="size" :height="size" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="11" fill="#1b2838" stroke="#66c0f4" stroke-width="1" />
    <circle cx="15.5" cy="8.5" r="3.2" fill="none" stroke="#c7d5e0" stroke-width="1.6" />
    <circle cx="15.5" cy="8.5" r="1.1" fill="#c7d5e0" />
    <circle cx="8.5" cy="15.5" r="2.6" fill="none" stroke="#c7d5e0" stroke-width="1.6" />
    <path d="M10.6 14.1 13.2 10.8" stroke="#c7d5e0" stroke-width="1.6" stroke-linecap="round" />
    <path d="M2 13.5 7.2 15.8" stroke="#c7d5e0" stroke-width="1.6" stroke-linecap="round" />
  </svg>

  <span v-else :style="{ width: `${size}px`, height: `${size}px`, display: 'inline-block', borderRadius: '50%', background: 'var(--panel-3)' }" aria-hidden="true" />
</template>
