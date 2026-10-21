<script setup>
import { ref, onMounted } from 'vue';
import CatCard from '../PosterCard/CatCard.vue';

// State
const catFacts = ref([]);
const loading = ref(false);
const error = ref(null);

// Fetch multiple cat facts
const fetchCatFacts = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    // Fetch 5 cat facts (we'll call the API 5 times)
    const promises = Array.from({ length: 5 }, () =>
      fetch('https://localhost:7101/api/practice/catfact')
        .then(res => res.json())
    );
    
    const results = await Promise.all(promises);
    catFacts.value = results;
  } catch (err) {
    error.value = 'Failed to fetch cat facts';
    console.error(err);
  } finally {
    loading.value = false;
  }
};

// Fetch on component mount
onMounted(() => {
  fetchCatFacts();
});
</script>

<template>
  <div :class="$style.row">
    <div :class="$style.header">
      <h2 :class="$style.title">Random Cat Facts</h2>
      <button 
        :class="$style.refreshButton" 
        @click="fetchCatFacts"
        :disabled="loading"
      >
        {{ loading ? 'Loading...' : 'Refresh' }}
      </button>
    </div>

    <div v-if="error" :class="$style.error">
      {{ error }}
    </div>

    <div v-else :class="$style.cards">
      <CatCard
        v-for="(catFact, index) in catFacts"
        :key="index"
        :fact="catFact.fact"
        :length="catFact.fact.length"
      />
    </div>
  </div>
</template>

<style module src="./CatRow.module.css"></style>