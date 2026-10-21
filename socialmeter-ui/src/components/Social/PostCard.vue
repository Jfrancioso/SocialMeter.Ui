<script setup>
import { computed, ref } from "vue";
import { formatCompact, timeAgo } from "../../utils/format";
import PlatformIcon from "./PlatformIcon.vue";
import styles from "./PostCard.module.css";

const props = defineProps({
  post: { type: Object, required: true }
});

const expanded = ref(false);
const long = computed(() => props.post.content.length > 280);
const text = computed(() => (long.value && !expanded.value ? `${props.post.content.slice(0, 280).trimEnd()}…` : props.post.content));

const handle = computed(() => (props.post.platform === "x" ? `@${props.post.author}` : `u/${props.post.author}`));
const where = computed(() => (props.post.platform === "reddit" && props.post.community ? `r/${props.post.community}` : props.post.platform === "x" ? "X" : ""));

const sentimentLabel = { positive: "Positive", neutral: "Neutral", negative: "Negative" };
</script>

<template>
  <article :class="[styles.card, styles[`s-${post.sentiment}`]]">
    <header :class="styles.head">
      <PlatformIcon :platform="post.platform" :size="22" />
      <div :class="styles.who">
        <span :class="styles.author">{{ handle }}</span>
        <span :class="styles.where">
          <template v-if="where">{{ where }} · </template>{{ timeAgo(post.createdAt) }}
          <span v-if="post.established" :class="styles.established" title="Long-standing account — counts at full weight">
            <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5L20 7" /></svg>
            established
          </span>
        </span>
      </div>
      <span :class="[styles.pill, styles[`pill-${post.sentiment}`]]" :title="`Sentiment score ${post.sentimentScore}`">
        {{ sentimentLabel[post.sentiment] ?? post.sentiment }}
      </span>
    </header>

    <p :class="styles.body">{{ text }}</p>
    <button v-if="long" type="button" :class="styles.more" @click="expanded = !expanded">
      {{ expanded ? "Show less" : "Read more" }}
    </button>

    <footer :class="styles.foot">
      <span :class="styles.stat" :title="post.platform === 'x' ? 'Likes' : 'Upvotes'">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 4 7 8h-4v8H9v-8H5z" /></svg>
        {{ formatCompact(post.upvotes) }}
      </span>
      <span :class="styles.stat" title="Comments">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1.1-3.7A8 8 0 1 1 20 12Z" /></svg>
        {{ formatCompact(post.comments) }}
      </span>
      <a v-if="post.sourceUrl" :href="post.sourceUrl" target="_blank" rel="noopener" :class="styles.link">Open post ↗</a>
    </footer>
  </article>
</template>
