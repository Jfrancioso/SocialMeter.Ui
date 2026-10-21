<script setup>
// Props = data passed from parent component
const props = defineProps({
  fact: {
    type: String,
    required: true
  },
  length: {
    type: Number,
    required: false,
    default: 0
  }
});
</script>

<template>
  <div :class="$style.card">
    <div :class="$style.icon">🐱</div>
    <p :class="$style.fact">{{ fact }}</p>
    <div :class="$style.meta">
      <span>{{ length }} characters</span>
    </div>
  </div>
</template>

<style module src="./CatCard.module.css"></style>