<script setup>
import { computed } from "vue";
import PostCard from "../Social/PostCard.vue";
import styles from "./InTheirWords.module.css";

// "In their words": the strongest take on each side, picked by the API (HighlightRules). A side with no featured post
// says why, so an empty half never looks broken. Posts sit behind the spoiler shield like every other post.
const props = defineProps({
  highlights: { type: Object, required: true },
  shielded: { type: Boolean, default: true }
});

const posts = (n, word) => `${n} ${word} post${n === 1 ? "" : "s"}`;
const pct = (share) => `${Math.round(share)}%`;

function note(word, side) {
  if (!side || side.posts === 0) return `No ${word} posts counted yet.`;
  // Too few posts or too little of the weight (HighlightRules.Featured); one sentence that is true either way.
  if (!side.featured) return `${posts(side.posts, word)} so far, ${pct(side.weightShare)} of the weight: not enough to feature one yet.`;
  return `None of the ${posts(side.posts, word)} reads well on its own: too short, mostly links, or marked as a spoiler.`;
}

const sides = computed(() =>
  [
    { key: "positive", label: "The case for", side: props.highlights.positive },
    { key: "negative", label: "The case against", side: props.highlights.negative }
  ].map((s) => ({
    ...s,
    post: s.side?.post ?? null,
    meta: s.side?.post ? `${posts(s.side.posts, s.key)} · ${pct(s.side.weightShare)} of the score’s weight` : "",
    note: s.side?.post ? "" : note(s.key, s.side)
  }))
);
</script>

<template>
  <div :class="styles.grid">
    <div v-for="s in sides" :key="s.key" :class="styles.col">
      <div :class="styles.label">
        <span :class="[styles.dot, styles[s.key]]" aria-hidden="true" />
        <span :class="styles.labelText">{{ s.label }}</span>
        <span v-if="s.meta" :class="styles.meta">{{ s.meta }}</span>
      </div>
      <PostCard v-if="s.post" :key="s.post.id" :post="s.post" :shielded="shielded" />
      <p v-else :class="styles.empty">{{ s.note }}</p>
    </div>
  </div>
</template>
